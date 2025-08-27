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

// Gera referência curta (<=20) usando os primeiros 20 chars do ObjectId
function makeThirdPartyRef(invoiceId) {
  return String(invoiceId).substring(0, 20);
}

// Gera transaction_reference com no máximo 20 chars (alfa-numérico, sem símbolos)
function makeTransactionRef() {
  const ts = Date.now().toString(36);          // base36 (curto)
  const rand = Math.random().toString(36).slice(2, 8); // 6 chars
  let ref = `TX${ts}${rand}`;                  // exemplo: TXk1x9abc...
  if (ref.length > 20) ref = ref.slice(0, 20);
  return ref;
}

/* Controller: inicia pagamento M-Pesa */
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

    // Gera refs seguros e curtos
    const thirdPartyRef = makeThirdPartyRef(invoice._id);   // <=20 chars (determinístico)
    const transactionRef = makeTransactionRef();            // <=20 chars

    // Prepara payload conforme docs (C2B singleStage)
    const payload = {
      input_TransactionReference: transactionRef,
      input_CustomerMSISDN: phone,
      input_Amount: String(amount),                 // string numérica sem "MZN"
      input_ThirdPartyReference: thirdPartyRef,
      input_ServiceProviderCode: mpesaConfig.serviceProviderCode,
      input_Country: "MOZ",
      input_Currency: "MZN"
    };

    // Guarda payload no audit (opcional) para debug
    try {
      await Audit.create({
        user: req.user?.id || null,
        rota: '/api/payments/mpesa',
        metodo: 'initiateMpesa_sentPayload',
        params: payload
      });
    } catch (aErr) {
      // não é fatal
      console.warn('Audit create falhou (não fatal):', aErr?.message || aErr);
    }

    // Faz a chamada ao provedor
    let response;
    try {
      // NOTE: a implementação do tx.c2b pode esperar nomes diferentes
      // Adaptámos o payload ao formato de exemplo do mpesa library
      // Se a tua Transaction.c2b usa nomes sem "input_" ajusta aqui conforme necessário.
      response = await tx.c2b({
        value: amount,
        client_number: phone,
        agent_id: mpesaConfig.serviceProviderCode,
        transaction_reference: transactionRef,
        third_party_reference: thirdPartyRef
      });
    } catch (errTx) {
      console.error('tx.c2b threw:', errTx?.response?.data || errTx?.message || errTx);
      response = errTx?.response?.data || { error: errTx?.message || 'Erro na chamada ao provedor' };
    }

    // Log e gravação do Payment inicial (usando a referência curta)
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: thirdPartyRef,        // mapping: usamos a ref curta como "reference"
        providerTransactionId: response?.output_TransactionID || null,
        metadata: response
      });
    } catch (pmErr) {
      console.warn('Falha ao criar Payment inicial (não fatal):', pmErr?.message || pmErr);
    }

    // marca invoice pendente
    invoice.status = 'pendente';
    if (response?.output_TransactionID) invoice.transactionId = response.output_TransactionID;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // devolve ao frontend o raw da operadora e o payload enviado
    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: response,
      sentPayload: payload
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

/* Controller: callback público que a Vodacom chama */
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
