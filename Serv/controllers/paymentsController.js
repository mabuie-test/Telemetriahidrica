// backend/controllers/paymentsController.js
const crypto = require('crypto');
const Transaction = require('../utils/Transaction');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Audit = require('../models/AuditLog');
const mpesaConfig = require('../config/mpesaConfig');

// instancia Transaction usando config
const tx = new Transaction(mpesaConfig.apiKey, mpesaConfig.publicKey, mpesaConfig.env);

/* Helpers (mantidos e expandidos) */
function normalizeAmount(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val === undefined || val === null) return NaN;
  const s = String(val).trim();
  if (s.length === 0) return NaN;
  const cleaned = s.replace(/[, ]+/g, '').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}
function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/[\s()+-]+/g, '').replace(/^\+/, '');
}
function randAlnum(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const buf = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
  return out;
}
function generateThirdPartyRef(invoiceId, suffixLen = 4) {
  const baseLen = Math.max(1, 20 - suffixLen);
  const base = String(invoiceId).substring(0, baseLen);
  const suffix = randAlnum(suffixLen);
  return (base + suffix).substring(0, 20);
}
function makeTransactionRef() {
  const ts = Date.now().toString(36);
  const rand = randAlnum(5);
  let ref = `TX${ts}${rand}`;
  if (ref.length > 20) ref = ref.slice(0, 20);
  return ref;
}
function isDuplicateResponse(resp) {
  const code = String(resp?.output_ResponseCode || resp?.Response?.output_ResponseCode || resp?.responseCode || '').toUpperCase();
  const desc = String(resp?.output_ResponseDesc || resp?.Response?.output_ResponseDesc || resp?.responseDesc || '').toUpperCase();
  return code.includes('INS-10') || desc.includes('DUPLICATE');
}
function isSuccessResponse(resp) {
  const code = String(resp?.output_ResponseCode || resp?.Response?.output_ResponseCode || resp?.responseCode || '');
  return code && (code === 'INS-0' || code.startsWith('INS-0'));
}

/**
 * Faz a chamada c2b e, em caso de timeout ou resposta incerta,
 * tenta consultar estado com tx.status (se disponível).
 * Retorna objecto { response, sentPayload, probedStatus (opcional) }.
 */
async function performC2BWithProbing(sentPayloadForAudit, txArgs) {
  // tentativa principal
  let response = null;
  let probe = null;
  try {
    response = await tx.c2b(txArgs);
  } catch (err) {
    // captura timeouts e outros
    response = err?.response?.data || { error: err?.message || String(err) };
  }

  // se houve timeout (axios produce 'timeout of ... exceeded' ou code ECONNABORTED) ou response é indefinida,
  // faz uma consulta ao endpoint de status se tivermos um transaction id ou conversaton id no response.
  // Tenta extrair um transaction id
  try {
    if ((String(response?.error || '').toLowerCase().includes('timeout')
         || String(response?.error || '').toLowerCase().includes('aborted')
         || !response)
        && (txArgs.third_party_reference || txArgs.transaction_reference)) {

      // tenta usar tx.status com diferentes chaves (transaction_reference ou third_party_reference)
      // Tenta por transaction_reference primeiro
      const probes = [];
      if (txArgs.transaction_reference) {
        probes.push({ transaction_id: txArgs.transaction_reference });
      }
      if (txArgs.third_party_reference) {
        probes.push({ transaction_id: txArgs.third_party_reference });
      }

      for (const p of probes) {
        try {
          probe = await tx.status({
            transaction_id: p.transaction_id,
            agent_id: txArgs.agent_id || txArgs.agent
          });
          if (probe) break;
        } catch (e) {
          // ignorar e continuar
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return { response, probe, sentPayloadForAudit };
}

/* Controller: inicia pagamento M-Pesa com retry contra duplicates e handling de timeout */
exports.initiateMpesa = async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;
    if (!invoiceId || !phoneNumber) return res.status(400).json({ error: 'invoiceId e phoneNumber são obrigatórios' });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    if (req.user?.papel === 'cliente') {
      const userMed = req.user.medidor;
      if (!userMed || String(userMed) !== String(invoice.medidor)) return res.status(403).json({ error: 'Acesso negado à fatura' });
    }

    const amount = normalizeAmount(invoice.total);
    const phone = normalizePhone(phoneNumber);
    if (!phone) return res.status(400).json({ error: 'Número de telefone inválido após normalização' });
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valor da fatura inválido para pagamento' });

    const attempts = [];
    const maxAttempts = 2; // 1 retry on duplicate
    let lastResponse = null;
    let sentPayload = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const thirdPartyRef = generateThirdPartyRef(invoice._id, 4);
      const transactionRef = makeTransactionRef();

      // payload que guardamos e (para debug) devolvemos
      const payloadForAudit = {
        input_TransactionReference: transactionRef,
        input_CustomerMSISDN: phone,
        input_Amount: String(amount),
        input_ThirdPartyReference: thirdPartyRef,
        input_ServiceProviderCode: mpesaConfig.serviceProviderCode,
        input_Country: "MOZ",
        input_Currency: "MZN"
      };

      // prepara args simples que tx.c2b espera (a tua Transaction.c2b aceita este formato)
      const txArgs = {
        value: amount,
        client_number: phone,
        agent_id: mpesaConfig.serviceProviderCode,
        transaction_reference: transactionRef,
        third_party_reference: thirdPartyRef
      };

      const { response, probe } = await performC2BWithProbing(payloadForAudit, txArgs);

      attempts.push({ attempt, thirdPartyRef, transactionRef, sentPayload: payloadForAudit, response, probe });
      lastResponse = response;
      sentPayload = payloadForAudit;

      // grava um Payment da tentativa (reference = thirdPartyRef)
      try {
        await Payment.create({
          invoice: invoice._id,
          method: 'mpesa',
          amount: invoice.total,
          reference: thirdPartyRef,
          providerTransactionId: response?.output_TransactionID || probe?.output_TransactionID || null,
          metadata: { response, probe }
        });
      } catch (pmErr) {
        console.warn('Falha ao criar Payment tentativa (não fatal):', pmErr?.message || pmErr);
      }

      // Se resposta indica sucesso (INS-0) marcamos imediatamente como paga
      if (isSuccessResponse(response) || isSuccessResponse(probe)) {
        invoice.status = 'paga';
        if (response?.output_TransactionID) invoice.transactionId = response.output_TransactionID;
        if (probe?.output_TransactionID) invoice.transactionId = probe.output_TransactionID;
        invoice.paymentMethod = 'mpesa';
        await invoice.save();

        // grava pagamento final (confirmatório)
        try {
          await Payment.create({
            invoice: invoice._id,
            method: 'mpesa',
            amount: invoice.total,
            reference: response?.output_TransactionID || probe?.output_TransactionID || thirdPartyRef,
            metadata: { response, probe }
          });
        } catch (pmErr) {
          console.warn('Falha ao criar Payment final (não fatal):', pmErr?.message || pmErr);
        }

        // grava audit
        try {
          await Audit.create({
            user: req.user?.id || null,
            rota: '/api/payments/mpesa',
            metodo: 'initiateMpesa',
            params: { invoiceId, phoneNumber: phone, attemptsSummary: attempts.map(a => ({ attempt: a.attempt, thirdPartyRef: a.thirdPartyRef, responseCode: a.response?.output_ResponseCode || a.probe?.output_ResponseCode })) }
          });
        } catch (aErr) {
          console.warn('Audit create falhou (não fatal):', aErr?.message || aErr);
        }

        // devolve ao frontend com attempts e raw
        return res.json({ message: 'Pedido enviado à operadora. Confirme no seu telemóvel.', raw: response, probe, attempts, sentPayload: payloadForAudit });
      }

      // se resposta é duplicate e ainda temos tentativas, continua e gere novo thirdPartyRef
      if (isDuplicateResponse(response)) {
        if (attempt < maxAttempts) {
          // avança para nova tentativa automática
          continue;
        } else {
          // última tentativa: devolve resultado (duplicate) ao frontend
          break;
        }
      }

      // se chegámos aqui, não foi success nem duplicate; devolve o que o provedor retornou
      break;
    } // fim loop attempts

    // marca invoice pendente (esperando callback)
    invoice.status = 'pendente';
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // audit resumo
    try {
      await Audit.create({
        user: req.user?.id || null,
        rota: '/api/payments/mpesa',
        metodo: 'initiateMpesa_summary',
        params: { invoiceId, phoneNumber: phone, attemptsSummary: attempts.map(a => ({ attempt: a.attempt, thirdPartyRef: a.thirdPartyRef, responseCode: a.response?.output_ResponseCode })) }
      });
    } catch (aErr) { /* ignore */ }

    // devolve ao frontend: última resposta + todas tentativas e payload enviado
    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: lastResponse,
      attempts,
      sentPayload
    });

  } catch (err) {
    console.error('initiateMpesa error:', err?.response?.data || err?.message || err);
    const details = err?.response?.data || err?.message || String(err);
    return res.status(500).json({ error: 'Erro ao iniciar pagamento M-Pesa', details });
  }
};

/* Callback: mantém lógica de mapeamento por third party reference ou Payment.reference */
exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body || {};
    const thirdRef = body.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference || body.ThirdPartyRef;
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.responseCode;
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID || body.TransactionID || body.transactionId;

    if (!thirdRef) {
      console.warn('Callback M-Pesa sem thirdRef:', body);
      return res.status(400).json({ error: 'Callback sem referência (third party reference)' });
    }

    // 1) procura Payment que usou essa referencia curta
    let payment = null;
    try {
      payment = await Payment.findOne({ reference: thirdRef }).sort({ createdAt: -1 }).populate('invoice');
    } catch (e) { console.warn('Erro ao procurar Payment por reference:', e?.message || e); }

    let invoice = null;
    if (payment && payment.invoice) invoice = payment.invoice;

    // 2) fallback: invoice cujo _id comece com thirdRef
    if (!invoice) {
      try { invoice = await Invoice.findOne({ _id: new RegExp(`^${thirdRef}`) }); }
      catch (e) { console.warn('Erro fallback findOne invoice by regex:', e?.message || e); }
    }

    if (!invoice) {
      console.warn('Invoice não encontrada para thirdRef:', thirdRef, 'body:', body);
      return res.status(404).json({ error: 'Fatura não encontrada para referência recebida' });
    }

    // Interpreta codigo
    if (String(outputCode).startsWith('INS-0') || String(outputCode) === 'INS-0') invoice.status = 'paga';
    else invoice.status = 'pendente';

    if (transactionId) invoice.transactionId = transactionId;
    await invoice.save();

    // grava Payment final com metadata do callback
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: transactionId || thirdRef,
        metadata: body
      });
    } catch (pmErr) { console.warn('Falha ao criar Payment final (não fatal):', pmErr?.message || pmErr); }

    return res.status(200).json({ message: 'Callback processado' });
  } catch (err) {
    console.error('mpesaCallback error:', err);
    return res.status(500).json({ error: 'Erro no processamento do callback' });
  }
};
