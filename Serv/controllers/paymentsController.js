// backend/controllers/paymentsController.js
const crypto = require('crypto');
const Transaction = require('../utils/Transaction');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Audit = require('../models/AuditLog');
const mpesaConfig = require('../config/mpesaConfig');

// instancia Transaction usando config
const tx = new Transaction(mpesaConfig.apiKey, mpesaConfig.publicKey, mpesaConfig.env);

/* Helpers */
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

// Gera uma parte aleatória alfa-numérica (maiúscula) com length chars
function randAlnum(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const buf = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

// Gera thirdPartyRef único com máximo 20 chars
// base: primeiros (20 - suffixLen) chars do invoiceId + suffix (randAlnum)
function generateThirdPartyRef(invoiceId, suffixLen = 4) {
  const baseLen = Math.max(1, 20 - suffixLen);
  const base = String(invoiceId).substring(0, baseLen);
  const suffix = randAlnum(suffixLen);
  return (base + suffix).substring(0, 20);
}

// Gera transaction_reference seguro <=20 chars
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

/* Controller: inicia pagamento M-Pesa com retry único para duplicates */
exports.initiateMpesa = async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;
    if (!invoiceId || !phoneNumber) {
      return res.status(400).json({ error: 'invoiceId e phoneNumber são obrigatórios' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    // Validação de pertença (cliente não paga fatura alheia)
    if (req.user?.papel === 'cliente') {
      const userMed = req.user.medidor;
      if (!userMed || String(userMed) !== String(invoice.medidor)) {
        return res.status(403).json({ error: 'Acesso negado à fatura' });
      }
    }

    // Normaliza amount e phone
    const amount = normalizeAmount(invoice.total);
    const phone = normalizePhone(phoneNumber);

    if (!phone) {
      return res.status(400).json({ error: 'Número de telefone inválido após normalização' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor da fatura inválido para pagamento' });
    }

    // Prepara tentativas: tentamos até maxRetries (1 retry extra)
    const attempts = [];
    const maxAttempts = 2;
    let lastResponse = null;
    let usedThirdRef = null;
    let usedProviderTxId = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // gera refs únicos a cada tentativa
      const thirdPartyRef = generateThirdPartyRef(invoice._id, 4); // ex.: first16 + 4chars
      const transactionRef = makeTransactionRef();

      // payload formatado (mantemos names que a Vodacom espera)
      const sentPayload = {
        input_TransactionReference: transactionRef,
        input_CustomerMSISDN: phone,
        input_Amount: String(amount),
        input_ThirdPartyReference: thirdPartyRef,
        input_ServiceProviderCode: mpesaConfig.serviceProviderCode,
        input_Country: "MOZ",
        input_Currency: "MZN"
      };

      // tenta enviar (usamos tx.c2b — a implementação interna pode mapear nomes)
      let response;
      try {
        // se a sua Transaction.c2b precisa de outro shape (sem "input_"),
        // a lib Transaction fará o mapeamento. Passamos também a versão simplificada
        response = await tx.c2b({
          value: amount,
          client_number: phone,
          agent_id: mpesaConfig.serviceProviderCode,
          transaction_reference: transactionRef,
          third_party_reference: thirdPartyRef
        });
      } catch (errTx) {
        // se a lib lança, tentamos obter errTx.response.data, senão montamos objecto
        console.error('tx.c2b threw:', errTx?.response?.data || errTx?.message || errTx);
        response = errTx?.response?.data || { error: errTx?.message || 'Erro na chamada ao provedor' };
      }

      // Guarda tentativa no array para devolver ao frontend
      attempts.push({ attempt, thirdPartyRef, transactionRef, sentPayload, response });

      // grava um Payment para esta tentativa (reference = thirdPartyRef)
      try {
        await Payment.create({
          invoice: invoice._id,
          method: 'mpesa',
          amount: invoice.total,
          reference: thirdPartyRef,
          providerTransactionId: response?.output_TransactionID || null,
          metadata: response
        });
      } catch (pmErr) {
        console.warn('Falha ao criar Payment tentativa (não fatal):', pmErr?.message || pmErr);
      }

      // marca alguns campos rastreio na invoice (não finalizamos ainda; esperamos callback)
      if (response?.output_TransactionID) {
        usedProviderTxId = response.output_TransactionID;
        invoice.transactionId = usedProviderTxId;
      }
      invoice.status = 'pendente';
      invoice.paymentMethod = 'mpesa';
      await invoice.save();

      lastResponse = response;
      usedThirdRef = thirdPartyRef;

      // se resposta não indica duplicate → break (sucesso ou outro código)
      if (!isDuplicateResponse(response)) {
        break;
      }

      // se é duplicate e ainda temos tentativas, vamos retryar (loop continua)
      console.warn(`Attempt ${attempt} recebeu Duplicate; will ${attempt < maxAttempts ? 'retry' : 'stop'}.`);
      // pequena pausa antes do retry (opcional; aqui não bloqueamos o event loop com sleep)
    }

    // Registos audit (opcional, inclui attempts)
    try {
      await Audit.create({
        user: req.user?.id || null,
        rota: '/api/payments/mpesa',
        metodo: 'initiateMpesa',
        params: {
          invoiceId,
          phoneNumber: phone,
          attemptsSummary: attempts.map(a => ({ attempt: a.attempt, thirdPartyRef: a.thirdPartyRef, responseCode: a.response?.output_ResponseCode }))
        }
      });
    } catch (aErr) {
      console.warn('Audit create falhou (não fatal):', aErr?.message || aErr);
    }

    // devolve ao frontend: última resposta 'raw' + todas tentativas (sentPayloads)
    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: lastResponse,
      attempts
    });

  } catch (err) {
    console.error('initiateMpesa error:', err?.response?.data || err?.message || err);
    const details = err?.response?.data || err?.message || String(err);
    return res.status(500).json({
      error: 'Erro ao iniciar pagamento M-Pesa',
      details
    });
  }
};

/* Callback mantém a mesma lógica (procura Payment.reference que corresponde ao thirdPartyRef) */
exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body || {};

    // Compatibiliza os possíveis campos da operadora
    const thirdRef = body.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference || body.ThirdPartyRef;
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.responseCode;
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID || body.TransactionID || body.transactionId;

    if (!thirdRef) {
      console.warn('Callback M-Pesa sem third party reference:', body);
      return res.status(400).json({ error: 'Callback sem referência (third party reference)' });
    }

    // 1) tenta mapear pelo Payment (reference = thirdPartyRef)
    let payment = null;
    try {
      payment = await Payment.findOne({ reference: thirdRef }).sort({ createdAt: -1 }).populate('invoice');
    } catch (e) {
      console.warn('Erro ao procurar Payment por reference:', e?.message || e);
    }

    let invoice = null;
    if (payment && payment.invoice) invoice = payment.invoice;

    // 2) fallback: procura invoice cujo _id comece com thirdRef (regex)
    if (!invoice) {
      try {
        invoice = await Invoice.findOne({ _id: new RegExp(`^${thirdRef}`) });
      } catch (e) {
        console.warn('Erro fallback findOne invoice by regex:', e?.message || e);
      }
    }

    if (!invoice) {
      console.warn('Invoice não encontrada para thirdRef:', thirdRef, 'body:', body);
      return res.status(404).json({ error: 'Fatura não encontrada para referência recebida' });
    }

    // Interpreta o código do provedor (INS-0 => sucesso)
    if (String(outputCode).startsWith('INS-0') || String(outputCode) === 'INS-0') {
      invoice.status = 'paga';
    } else {
      invoice.status = 'pendente';
    }

    if (transactionId) invoice.transactionId = transactionId;
    await invoice.save();

    // grava Payment final
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: transactionId || thirdRef,
        metadata: body
      });
    } catch (pmErr) {
      console.warn('Falha ao criar Payment final (não fatal):', pmErr?.message || pmErr);
    }

    return res.status(200).json({ message: 'Callback processado' });
  } catch (err) {
    console.error('mpesaCallback error:', err);
    return res.status(500).json({ error: 'Erro no processamento do callback' });
  }
};
