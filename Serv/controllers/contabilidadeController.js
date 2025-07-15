const Invoice       = require('../models/Invoice');
const Payment       = require('../models/Payment');
const Medidor       = require('../models/Medidor');
const { consumoMinimo, extra, multaPercent } = require('../config/billingConfig');

// 1. Gerar ou obter fatura para medidor/ano/mês
exports.getOrCreateInvoice = async (req, res) => {
  const medidorId = req.user.medidor;  // admin pode fornecer query.medidor
  const year = parseInt(req.query.year,10);
  const month = parseInt(req.query.month,10);

  // 1.1 busca consumo total do mês (pipeline ou serviço existente)
  // Para simplificar, soma de leituras:
  const { default: mongoose } = require('mongoose');
  const Leitura = require('../models/Leitura');
  const inicio = new Date(year, month-1, 1);
  const fim    = new Date(year, month, 1);
  const agg = await Leitura.aggregate([
    { $match: { medidorId: mongoose.Types.ObjectId(medidorId), timestamp: {$gte:inicio,$lt:fim} }},
    { $group: { _id: null, totalConsumo: { $sum: "$consumoDiario" } } }
  ]);
  const consumo = agg[0]?.totalConsumo || 0;

  // 1.2 Busca última fatura pendente para aplicar multa
  const prevInvoice = await Invoice.findOne({ medidor: medidorId, status:'pendente' }).sort({year:-1,month:-1});

  // 1.3 Calcula valores
  const valorBase  = consumo <= consumoMinimo.x ? consumoMinimo.y : consumoMinimo.y;
  const valorExtra = consumo > consumoMinimo.x ? (consumo - consumoMinimo.x) * extra.z : 0;
  const multa      = prevInvoice ? prevInvoice.total * multaPercent : 0;
  const total      = valorBase + valorExtra + multa;

  // 1.4 Cria ou atualiza fatura
  const [invoice] = await Invoice.findOneAndUpdate(
    { medidor: medidorId, year, month },
    { medidor: medidorId, year, month, consumo, valorBase, valorExtra, multa, total },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 1.5 Se multa>0 marca trecho de aviso
  res.json(invoice);
};

// 2. Histórico de faturas
exports.listInvoices = async (req, res) => {
  const medidorId = req.user.papel==='admin' ? req.query.medidorId : req.user.medidor;
  const invs = await Invoice.find({ medidor: medidorId }).sort({ year:-1, month:-1 });
  res.json(invs);
};

// 3. Registrar pagamento
exports.payInvoice = async (req, res) => {
  const { invoiceId, method } = req.body;
  // 3.1 Simula chamada externa e obtém referência
  const reference = `${method}-${Date.now()}`;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada.' });

  // 3.2 Cria pagamento
  const payment = await Payment.create({ invoice: invoiceId, method, amount: invoice.total, reference });
  // 3.3 Atualiza fatura
  invoice.status = 'paga';
  await invoice.save();

  res.json({ payment, invoice });
};

// 4. Suspender ou reativar contador
exports.toggleSuspend = async (req, res) => {
  const medidorId = req.params.id;
  const med = await Medidor.findById(medidorId);
  if (!med) return res.status(404).json({ error: 'Medidor não encontrado.' });
  med.suspended = !med.suspended;
  await med.save();
  res.json(med);
};
