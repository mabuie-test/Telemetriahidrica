const mongoose       = require('mongoose');
const Invoice        = require('../models/Invoice');
const Payment        = require('../models/Payment');
const Medidor        = require('../models/Medidor');
const Leitura        = require('../models/Leitura');
const {
  consumoMinimo,
  extra,
  multaPercent
} = require('../config/billingConfig');

/**
 * 1. Gerar ou obter fatura para medidor/ano/mês
 */
exports.getOrCreateInvoice = async (req, res) => {
  try {
    const medidorId = req.user.medidor;  // ou req.query.medidorId para admin
    const year      = parseInt(req.query.year, 10);
    const month     = parseInt(req.query.month, 10);

    // Define o período
    const inicio = new Date(year, month - 1, 1);
    const fim    = new Date(year, month, 1);

    // 1.1 Soma consumo diário no mês
    const agg = await Leitura.aggregate([
      {
        $match: {
          medidorId: new mongoose.Types.ObjectId(medidorId),
          timestamp: { $gte: inicio, $lt: fim }
        }
      },
      {
        $group: {
          _id: null,
          totalConsumo: { $sum: '$consumoDiario' }
        }
      }
    ]);
    const consumo = agg[0]?.totalConsumo || 0;

    // 1.2 Busca última fatura pendente (para multa)
    const prevInvoice = await Invoice.findOne({
      medidor: medidorId,
      status: 'pendente'
    }).sort({ year: -1, month: -1 });

    // 1.3 Cálculo de valores
    const valorBase  = consumoMinimo.y;
    const valorExtra = consumo > consumoMinimo.x
      ? (consumo - consumoMinimo.x) * extra.z
      : 0;
    const multa      = prevInvoice ? prevInvoice.total * multaPercent : 0;
    const total      = valorBase + valorExtra + multa;

    // 1.4 Cria ou atualiza a fatura
    const invoice = await Invoice.findOneAndUpdate(
      { medidor: medidorId, year, month },
      { medidor: medidorId, year, month, consumo, valorBase, valorExtra, multa, total },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(invoice);
  } catch (err) {
    console.error('getOrCreateInvoice error:', err);
    res.status(500).json({ error: 'Erro ao gerar fatura.' });
  }
};

/**
 * 2. Histórico de faturas
 */
exports.listInvoices = async (req, res) => {
  try {
    const medidorId = req.user.papel === 'admin'
      ? req.query.medidorId
      : req.user.medidor;

    const invs = await Invoice.find({ medidor: medidorId })
      .sort({ year: -1, month: -1 });

    res.json(invs);
  } catch (err) {
    console.error('listInvoices error:', err);
    res.status(500).json({ error: 'Erro ao listar faturas.' });
  }
};

/**
 * 3. Registrar pagamento
 */
exports.payInvoice = async (req, res) => {
  try {
    const { invoiceId, method } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Fatura não encontrada.' });
    }

    // Simula chamada externa de pagamento
    const reference = `${method}-${Date.now()}`;

    const payment = await Payment.create({
      invoice: invoiceId,
      method,
      amount: invoice.total,
      reference
    });

    invoice.status = 'paga';
    await invoice.save();

    res.json({ payment, invoice });
  } catch (err) {
    console.error('payInvoice error:', err);
    res.status(500).json({ error: 'Erro ao processar pagamento.' });
  }
};

/**
 * 4. Suspender ou reativar contador
 */
exports.toggleSuspend = async (req, res) => {
  try {
    const medidorId = req.params.id;
    const med = await Medidor.findById(medidorId);
    if (!med) {
      return res.status(404).json({ error: 'Medidor não encontrado.' });
    }
    med.suspended = !med.suspended;
    await med.save();
    res.json(med);
  } catch (err) {
    console.error('toggleSuspend error:', err);
    res.status(500).json({ error: 'Erro ao alterar estado do contador.' });
  }
};
