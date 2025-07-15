const mongoose        = require('mongoose');
const Invoice         = require('../models/Invoice');
const Payment         = require('../models/Payment');
const Medidor         = require('../models/Medidor');
const Leitura         = require('../models/Leitura');
const BillingParams   = require('../models/BillingParams');
const Audit           = require('../models/AuditLog');

/**
 * 0. GET /api/contabilidade/params
 */
exports.getBillingParams = async (req, res) => {
  try {
    const params = await BillingParams.getParams();
    await Audit.create({
      user:   req.user.id,
      rota:   '/api/contabilidade/params',
      metodo: 'getBillingParams',
      params: {}
    });
    res.json(params);
  } catch (err) {
    console.error('getBillingParams error:', err);
    res.status(500).json({ error: 'Erro ao buscar parâmetros.' });
  }
};

/**
 * 0. PATCH /api/contabilidade/params
 */
exports.setBillingParams = async (req, res) => {
  try {
    const { consumoMinimo, extra, multaPercent } = req.body;
    const params = await BillingParams.getParams();
    params.consumoMinimo = consumoMinimo;
    params.extra         = extra;
    params.multaPercent  = multaPercent;
    await params.save();
    await Audit.create({
      user:   req.user.id,
      rota:   '/api/contabilidade/params',
      metodo: 'setBillingParams',
      params: req.body
    });
    res.json(params);
  } catch (err) {
    console.error('setBillingParams error:', err);
    res.status(500).json({ error: 'Erro ao atualizar parâmetros.' });
  }
};

/**
 * 1. POST /api/contabilidade/bulk
 */
exports.bulkGenerateInvoices = async (req, res) => {
  try {
    const year  = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const params = await BillingParams.getParams();

    const medidores = await Medidor.find({ suspended: false }).populate('cliente');
    const invoices = [];

    for (const m of medidores) {
      const mid    = m._id;
      const inicio = new Date(year, month - 1, 1);
      const fim    = new Date(year, month, 1);

      const agg = await Leitura.aggregate([
        { $match: {
            medidorId: new mongoose.Types.ObjectId(mid),
            timestamp: { $gte: inicio, $lt: fim }
        }},
        { $group: { _id: null, totalConsumo: { $sum: '$consumoDiario' } } }
      ]);
      const consumo = agg[0]?.totalConsumo || 0;

      const prev = await Invoice.findOne({ medidor: mid, status: 'pendente' })
        .sort({ year: -1, month: -1 });

      const valorBase  = params.consumoMinimo.y;
      const valorExtra = consumo > params.consumoMinimo.x
        ? (consumo - params.consumoMinimo.x) * params.extra.z
        : 0;
      const multa      = prev ? prev.total * params.multaPercent : 0;
      const total      = valorBase + valorExtra + multa;

      const inv = await Invoice.findOneAndUpdate(
        { medidor: mid, year, month },
        { medidor: mid, year, month, consumo, valorBase, valorExtra, multa, total },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      invoices.push(inv);

      await Audit.create({
        user:   req.user.id,
        rota:   '/api/contabilidade/bulk',
        metodo: 'bulkGenerateInvoices',
        params: { medidor: mid, year, month }
      });
    }

    res.json(invoices);
  } catch (err) {
    console.error('bulkGenerateInvoices error:', err);
    res.status(500).json({ error: 'Erro na geração de faturas em massa.' });
  }
};

/**
 * 2. GET /api/contabilidade/all
 */
exports.listAllInvoices = async (req, res) => {
  try {
    const year  = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const invs  = await Invoice.find({ year, month })
                  .populate({ path: 'medidor', populate: 'cliente' });
    await Audit.create({
      user:   req.user.id,
      rota:   '/api/contabilidade/all',
      metodo: 'listAllInvoices',
      params: { year, month }
    });
    res.json(invs);
  } catch (err) {
    console.error('listAllInvoices error:', err);
    res.status(500).json({ error: 'Erro ao listar faturas.' });
  }
};

/**
 * 3. GET /api/contabilidade/client
 */
exports.listClientInvoices = async (req, res) => {
  try {
    const mid  = req.user.medidor;
    const invs = await Invoice.find({ medidor: mid }).sort({ year: -1, month: -1 });
    await Audit.create({
      user:   req.user.id,
      rota:   '/api/contabilidade/client',
      metodo: 'listClientInvoices',
      params: {}
    });
    res.json(invs);
  } catch (err) {
    console.error('listClientInvoices error:', err);
    res.status(500).json({ error: 'Erro ao listar suas faturas.' });
  }
};

/**
 * 4. POST /api/contabilidade/pay
 */
exports.payInvoice = async (req, res) => {
  try {
    const { invoiceId, method } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada.' });

    const reference = `${method}-${Date.now()}`;
    const payment = await Payment.create({ invoice: invoiceId, method, amount: invoice.total, reference });

    invoice.status = 'paga';
    await invoice.save();

    await Audit.create({
      user:   req.user.id,
      rota:   '/api/contabilidade/pay',
      metodo: 'payInvoice',
      params: { invoiceId, method, reference }
    });

    res.json({ payment, invoice });
  } catch (err) {
    console.error('payInvoice error:', err);
    res.status(500).json({ error: 'Erro ao processar pagamento.' });
  }
};

/**
 * 5. PATCH /api/contabilidade/medidor/:id/suspend
 */
exports.toggleSuspend = async (req, res) => {
  try {
    const medidorId = req.params.id;
    const med = await Medidor.findById(medidorId);
    if (!med) return res.status(404).json({ error: 'Medidor não encontrado.' });

    med.suspended = !med.suspended;
    await med.save();

    await Audit.create({
      user:   req.user.id,
      rota:   `/api/contabilidade/medidor/${medidorId}/suspend`,
      metodo: 'toggleSuspend',
      params: { medidorId }
    });

    res.json(med);
  } catch (err) {
    console.error('toggleSuspend error:', err);
    res.status(500).json({ error: 'Erro ao alterar estado do contador.' });
  }
};
