// backend/controllers/paymentsController.js
const axios = require('axios');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment'); // já existe no teu projecto
const Audit   = require('../models/AuditLog'); // opcional para logging de auditoria
const { serviceProviderCode, baseURL } = require('../config/mpesaConfig');
const { generateBearerFromApiKey } = require('../utils/mpesaAuth');

exports.initiateMpesa = async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;
    if (!invoiceId || !phoneNumber) return res.status(400).json({ error: 'invoiceId e phoneNumber são obrigatórios' });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    // Verifica propriedade: se cliente tenta pagar fatura que não é do seu medidor
    if (req.user?.papel === 'cliente') {
      const userMed = req.user.medidor;
      if (!userMed || String(userMed) !== String(invoice.medidor)) {
        return res.status(403).json({ error: 'Acesso negado à fatura' });
      }
    }

    // Gera Bearer (Authorization header) encriptando a API Key com a Public Key
    const bearer = generateBearerFromApiKey();

    // Prepara payload conforme documentação da Vodacom (C2B singleStage)
    const payload = {
      input_TransactionReference: `TX-${Date.now()}`,
      input_CustomerMSISDN: phoneNumber,
      input_Amount: String(invoice.total),
      input_ThirdPartyReference: String(invoice._id),
      input_ServiceProviderCode: serviceProviderCode,
      input_Country: "MOZ",
      input_Currency: "MZN"
    };

    // Faz a chamada à Vodacom
    const url = `${baseURL.replace(/\/+$/,'')}/c2bPayment/singleStage/`;
    const r = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    // Regista pagamento inicial como pendente (USSD será confirmado pelo cliente no telemóvel)
    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: r.data?.output_TransactionID || r.data?.output_ThirdPartyReference || null,
    });

    invoice.status = 'pendente';
    invoice.transactionId = r.data?.output_TransactionID || invoice.transactionId;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // opcional: regista Audit
    if (req.user?.id) {
      await Audit.create({
        user: req.user.id,
        rota: '/api/payments/mpesa',
        metodo: 'initiateMpesa',
        params: { invoiceId, phoneNumber }
      });
    }

    return res.json({ message: 'Pedido enviado à operadora. Confirme no seu telemóvel.', raw: r.data });
  } catch (err) {
    console.error('initiateMpesa error:', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Erro ao iniciar pagamento M-Pesa' });
  }
};

// Callback público que Vodacom chamará (regista resultado definitivo)
exports.mpesaCallback = async (req, res) => {
  try {
    // A Vodacom pode enviar payloads com formatos ligeiramente diferentes;
    // tentamos ler os campos mais comuns.
    const body = req.body || {};
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.output_ResponseCode;
    const outputDesc = body.output_ResponseDesc || body.Response?.output_ResponseDesc || JSON.stringify(body);
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID;
    const thirdRef = body.output_ThirdPartyReference || body.Response?.output_ThirdPartyReference || body.ThirdPartyReference;

    // Se não veio o third party reference, tenta extrair de outro local
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

    // Se código INS-0 → sucesso
    if (String(outputCode).startsWith('INS-0') || String(outputCode) === 'INS-0') {
      invoice.status = 'paga';
    } else {
      // mantém pendente se não for confirmado; podes escolher marcar 'suspenso' ou outro
      invoice.status = 'pendente';
    }

    if (transactionId) invoice.transactionId = transactionId;
    await invoice.save();

    // opcional: registar Payment adicional com estado final
    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: transactionId || null,
    });

    // responde 200 à Vodacom
    return res.status(200).json({ message: 'Callback processado' });
  } catch (err) {
    console.error('mpesaCallback error:', err);
    return res.status(500).json({ error: 'Erro no processamento do callback' });
  }
};
