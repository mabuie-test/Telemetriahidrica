// backend/controllers/paymentsController.js
const Transaction = require('../utils/Transaction');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Audit = require('../models/AuditLog');
const mpesaConfig = require('../config/mpesaConfig');

// instancia Transaction usando config
const tx = new Transaction(mpesaConfig.apiKey, mpesaConfig.publicKey, mpesaConfig.env);

/**
 * Normaliza o valor da fatura para um número (remove "MZN", vírgulas, espaços, etc).
 * Retorna número (float) ou NaN se inválido.
 */
function normalizeAmount(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val === undefined || val === null) return NaN;
  const s = String(val).trim();
  if (s.length === 0) return NaN;
  // remove vírgulas, espaços e unidades (e.g. "MZN")
  const cleaned = s.replace(/[, ]+/g, '').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

/**
 * Normaliza MSISDN: remove espaços, parênteses, e leading +.
 * Não força prefixo de país — espera-se que o frontend envie com código do país (ex: 25884xxxx).
 */
function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/[\s()-]+/g, '').replace(/^\+/, '');
}

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

    // Prepara dados para c2b conforme exemplo
    const data = {
      value: amount, // numeric, sem unidade
      client_number: phone,
      agent_id: mpesaConfig.serviceProviderCode,
      transaction_reference: `TX-${Date.now()}`,
      third_party_reference: String(invoice._id)
    };

    // Executa chamada (Transaction.c2b) com tratamento robusto
    let response;
    try {
      response = await tx.c2b(data);
    } catch (errTx) {
      // O Request.post da tua lib costuma devolver ex.response.data no catch,
      // mas por segurança capturamos qualquer erro e tentamos extrair informação útil.
      console.error('tx.c2b threw:', errTx?.response?.data || errTx?.message || errTx);
      // Se errTx.response?.data existir, use-o; senão, constrói um objecto com a mensagem.
      response = errTx?.response?.data || { error: errTx?.message || 'Erro na chamada ao provedor' };
    }

    // Log completo da resposta (útil para debug e será devolvido ao frontend)
    try {
      console.log('Vodacom/Tx response for initiateMpesa:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Vodacom/Tx response (non-serializable):', response);
    }

    // extrai identificadores úteis (se existirem)
    const outTxId = response?.output_TransactionID || response?.output_ThirdPartyReference || response?.TransactionID || null;
    const respCode = response?.output_ResponseCode || response?.Response?.output_ResponseCode || response?.responseCode || null;

    // regista pagamento inicial como pendente/initiated (guardamos metadata quando possível)
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: outTxId,
        metadata: response
      });
    } catch (pmErr) {
      // não falha o fluxo se o Payment não puder ser gravado por causa de schema; logamos para debug
      console.warn('Falha ao criar Payment (não fatal):', pmErr?.message || pmErr);
    }

    // marca invoice pendente (esperando callback)
    invoice.status = 'pendente';
    if (outTxId) invoice.transactionId = outTxId;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    // regista audit (opcional)
    if (req.user?.id) {
      try {
        await Audit.create({
          user: req.user.id,
          rota: '/api/payments/mpesa',
          metodo: 'initiateMpesa',
          params: { invoiceId, phoneNumber: phone, amount, responseSummary: { code: respCode } }
        });
      } catch (aErr) {
        console.warn('Audit create falhou (não fatal):', aErr?.message || aErr);
      }
    }

    // devolve sempre o raw para o frontend ver
    return res.json({
      message: 'Pedido enviado à operadora. Confirme no seu telemóvel.',
      raw: response
    });

  } catch (err) {
    // Exibe o erro de forma detalhada (quando possível)
    console.error('initiateMpesa error:', err?.response?.data || err?.message || err);
    const details = err?.response?.data || err?.message || String(err);
    return res.status(500).json({
      error: 'Erro ao iniciar pagamento M-Pesa',
      details
    });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body || {};

    // compatibiliza os possíveis campos do callback
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode || body.output_ResponseCode || body.responseCode;
    const transactionId = body.output_TransactionID || body.Response?.output_TransactionID || body.TransactionID || body.transactionId;
    const thirdRef = body.output_ThirdPartyReference || body.Response?.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference;
    const invoiceId = thirdRef || body.ThirdPartyReference || body.input_ThirdPartyReference || body.input_ThirdPartyReference;

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
    try {
      await Payment.create({
        invoice: invoice._id,
        method: 'mpesa',
        amount: invoice.total,
        reference: transactionId || null,
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
