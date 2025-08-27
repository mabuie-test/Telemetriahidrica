// Gera referência curta de 20 caracteres no máximo
function makeThirdPartyRef(invoiceId) {
  return String(invoiceId).substring(0, 20);
}
exports.initiateMpesa = async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;
    if (!invoiceId || !phoneNumber) {
      return res.status(400).json({ error: 'invoiceId e phoneNumber são obrigatórios' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    // valida cliente
    if (req.user?.papel === 'cliente') {
      const userMed = req.user.medidor;
      if (!userMed || String(userMed) !== String(invoice.medidor)) {
        return res.status(403).json({ error: 'Acesso negado à fatura' });
      }
    }

    const amount = normalizeAmount(invoice.total);
    const phone = normalizePhone(phoneNumber);
    if (!phone) return res.status(400).json({ error: 'Número de telefone inválido' });
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valor da fatura inválido' });

    // gera referência curta
    const thirdRef = makeThirdPartyRef(invoice._id);

    const data = {
      value: amount,
      client_number: phone,
      agent_id: mpesaConfig.serviceProviderCode,
      transaction_reference: `TX-${Date.now()}`,
      third_party_reference: thirdRef
    };

    let response;
    try {
      response = await tx.c2b(data);
    } catch (errTx) {
      console.error('tx.c2b threw:', errTx?.response?.data || errTx?.message || errTx);
      response = errTx?.response?.data || { error: errTx?.message || 'Erro na chamada ao provedor' };
    }

    const outTxId = response?.output_TransactionID || response?.output_ThirdPartyReference || null;

    // regista pagamento, guardando a ref curta e a real
    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: outTxId,
      thirdPartyRef: thirdRef,   // 👈 guardamos aqui a curta
      metadata: response
    });

    invoice.status = 'pendente';
    invoice.transactionId = outTxId || invoice.transactionId;
    invoice.paymentMethod = 'mpesa';
    await invoice.save();

    return res.json({
      message: 'Pedido enviado à operadora. Confirme a transacção inserindo o PIN no seu telemóvel.',
      raw: response
    });

  } catch (err) {
    console.error('initiateMpesa error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'Erro ao iniciar pagamento M-Pesa', details: err.message });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    const body = req.body || {};
    const thirdRef = body.output_ThirdPartyReference || body.ThirdPartyReference || body.input_ThirdPartyReference;
    const outputCode = body.output_ResponseCode || body.Response?.output_ResponseCode;
    const transactionId = body.output_TransactionID || body.TransactionID;

    if (!thirdRef) {
      console.warn('Callback sem thirdRef:', body);
      return res.status(400).json({ error: 'Callback sem referência' });
    }

    // procurar pagamento que tenha usado essa thirdPartyRef curta
    const payment = await Payment.findOne({ thirdPartyRef: thirdRef }).populate('invoice');
    if (!payment || !payment.invoice) {
      console.warn('Nenhum Payment encontrado para thirdRef', thirdRef);
      return res.status(404).json({ error: 'Pagamento/fatura não encontrado' });
    }

    const invoice = payment.invoice;

    if (String(outputCode).startsWith('INS-0')) {
      invoice.status = 'paga';
    } else {
      invoice.status = 'pendente';
    }

    if (transactionId) invoice.transactionId = transactionId;
    await invoice.save();

    await Payment.create({
      invoice: invoice._id,
      method: 'mpesa',
      amount: invoice.total,
      reference: transactionId,
      metadata: body
    });

    return res.status(200).json({ message: 'Callback processado' });

  } catch (err) {
    console.error('mpesaCallback error:', err);
    return res.status(500).json({ error: 'Erro no processamento do callback' });
  }
};
