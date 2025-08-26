// backend/controllers/paymentsController.js
const Transaction = require('../utils/Transaction');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Audit = require('../models/AuditLog');
const mpesaConfig = require('../config/mpesaConfig');

// instancia Transaction usando config
const tx = new Transaction(mpesaConfig.apiKey, mpesaConfig.publicKey, mpesaConfig.env);

exports.initiateMpesa = async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;
    if (!invoiceId || !phoneNumber) {
      return res.status(400).json({ error: 'invoiceId e phoneNumber são obrigatórios' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    // Validacao de pertença (cliente não paga fatura alheia)
    if (req.user?.papel === 'cliente') {
      const userMed = req.user.medidor;
      if (!userMed || String(userMed) !== String(invoice.medidor)) {
        return res.status(403).json({ error: 'Acesso negado à fatura' });
      }
    }

    // Prepara dados para c2b conforme exemplo
    const data = {
      value: Number(invoice.total), // número
      client_number: phoneNumber,
      agent_id: mpesaConfig.serviceProviderCode,
      transaction_reference: `TX-${Date.now()}`,
      third_party_reference: String(invoice._id)
    };

    // chama Transaction.c2b (usa MpesaRequest internamente)
    const response = await tx.c2b(data);

    // response formato pode variar; registamos o que houver
    const outTxId = response?.output_TransactionID || response?.output_ThirdPartyReference || null;

    // regista pagamento inicial (estado "initiated"/pendente)
    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: outTxId,
      metadata: response
    });

    // marca invoice pendente (esperando callback)
    invoice.status = 'pendente';
    if (outTxId) invoice.transactionId = outTxId;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // regista audit
    if (req.user?.id) {
      await Audit.create({
        user: req.user.id,
        rota: '/api/payments/mpesa',
        metodo: 'initiateMpesa',
        params: { invoiceId, phoneNumber, responseSummary: { code: response?.output_ResponseCode } }
      });
    }

    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: response
    });
  } catch (err) {
    // log detalhado para debug
    console.error('initiateMpesa error:', err.response?.data || err.message || err);
    return res.status(500).json({
      error: 'Erro ao iniciar pagamento M-Pesa',
      details: err.response?.data || err.message
    });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body || {};

    // compatibiliza os possíveis campos do callback
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.output_ResponseCode;
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID || body.TransactionID;
    const thirdRef = body.output_ThirdPartyReference || body.Response?.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference;
    const invoiceId = thirdRef || body.ThirdPartyReference || body.input_ThirdPartyReference;

    if (!invoiceId) {
      console.warn('Callback M-Pesa sem referência a fatura:', body);
      return res.status(400).json({ error: 'Callback sem invoice reference' });
    }

    const invoice = await Invoice.findById(String(invoiceId));
    if (!invoice) {
      console.warn('Invoice do callback não encontrada:', invoiceId);
      return res.status(404).json({ error: 'Fatura não encontrada' });
    }

    // INS-0 → sucesso (conforme exemplo)
    if (String(outputCode).startsWith('INS-0') || String(outputCode) === 'INS-0') {
      invoice.status = 'paga';
    } else {
      // mantém pendente ou marca falha conforme política
      invoice.status = 'pendente';
    }

    if (transactionId) invoice.transactionId = transactionId;
    await invoice.save();

    // regista pagamento final
    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: transactionId || null,
      metadata: body
    });

    return res.status(200).json({ message: 'Callback processado' });
  } catch (err) {
    console.error('mpesaCallback error:', err);
    return res.status(500).json({ error: 'Erro no processamento do callback' });
  }
};
