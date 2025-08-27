// backend/controllers/paymentsController.js
const Transaction = require('../utils/Transaction');
const Invoice = require('../models/Invoice');          // ← garante que Invoice está definido
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

// Gera referência curta com no máximo 20 caracteres (Vodacom exige <=20)
function makeThirdPartyRef(invoiceId) {
  return String(invoiceId).substring(0, 20);
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

    // Trunca/gera referência curta
    const thirdPartyRef = makeThirdPartyRef(invoice._id);

    // Prepara payload conforme docs (C2B singleStage)
    const data = {
      value: amount,
      client_number: phone,
      agent_id: mpesaConfig.serviceProviderCode,
      transaction_reference: `TX-${Date.now()}`,
      third_party_reference: thirdPartyRef
    };

    // Chamada ao provedor
    let response;
    try {
      response = await tx.c2b(data);
    } catch (errTx) {
      console.error('tx.c2b threw:', errTx?.response?.data || errTx?.message || errTx);
      response = errTx?.response?.data || { error: errTx?.message || 'Erro na chamada ao provedor' };
    }

    // Log para debugging
    try { console.log('Vodacom/Tx response (initiateMpesa):', JSON.stringify(response, null, 2)); }
    catch (e) { console.log('Vodacom/Tx response (non-serializable):', response); }

    // extrai IDs retornados (se existirem)
    const providerTxId = response?.output_TransactionID || response?.output_ThirdPartyReference || response?.TransactionID || null;
    const respCode = response?.output_ResponseCode || response?.Response?.output_ResponseCode || null;

    // Regista Payment inicial usando a reference curta (para mapeamento no callback)
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: thirdPartyRef,     // guardamos a ref curta em "reference"
        providerTransactionId: providerTxId,
        metadata: response
      });
    } catch (pmErr) {
      console.warn('Falha ao criar Payment inicial (não fatal):', pmErr?.message || pmErr);
    }

    // Marca invoice como pendente
    invoice.status = 'pendente';
    if (providerTxId) invoice.transactionId = providerTxId;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // Audit (opcional)
    if (req.user?.id) {
      try {
        await Audit.create({
          user: req.user.id,
          rota: '/api/payments/mpesa',
          metodo: 'initiateMpesa',
          params: { invoiceId, phoneNumber: phone, amount, thirdPartyRef, respCode }
        });
      } catch (aErr) {
        console.warn('Audit create falhou (não fatal):', aErr?.message || aErr);
      }
    }

    // Envia resposta ao frontend (raw para debugging)
    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: response,
      thirdPartyRef
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

    //Compatibiliza vários formatos possíveis do provedor
    const thirdRef = body.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference || body.ThirdPartyRef;
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.responseCode || body.Response?.responseCode;
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID || body.TransactionID || body.transactionId;

    if (!thirdRef) {
      console.warn('Callback M-Pesa sem third party reference:', body);
      return res.status(400).json({ error: 'Callback sem referência (third party reference)' });
    }

    // 1) Tenta mapear pelo Payment criado no initiate (reference = thirdPartyRef)
    let payment = null;
    try {
      payment = await Payment.findOne({ reference: thirdRef }).sort({ createdAt: -1 }).populate('invoice');
    } catch (e) {
      console.warn('Erro ao procurar Payment por reference:', e?.message || e);
    }

    let invoice = null;
    if (payment && payment.invoice) {
      invoice = payment.invoice;
    }

    // 2) Fallback: procura invoice cujo _id comece com thirdRef (regex)
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

    // grava Payment final (com o reference do provedor quando disponível)
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
