const Leitura = require('../models/Leitura');
const Audit   = require('../models/AuditLog');
const mongoose = require('mongoose');

// GET /api/relatorios/diario?medidorId=&date=
exports.relatorioDiario = async (req, res) => {
  const { medidorId, date } = req.query;
  const dataInicio = new Date(date);
  const dataFim = new Date(date);
  dataFim.setDate(dataFim.getDate() + 1);

  const leituras = await Leitura.find({
    medidorId: mongoose.Types.ObjectId(medidorId),
    timestamp: { $gte: dataInicio, $lt: dataFim }
  }).sort('timestamp');

  // Auditoria
  await Audit.create({
    user: req.user.id,
    rota: '/api/relatorios/diario',
    metodo: 'relatorioDiario',
    params: { medidorId, date }
  });

  res.json(leituras);
};

// GET /api/relatorios/mensal?medidorId=&year=&month=
exports.relatorioMensal = async (req, res) => {
  const { medidorId, year, month } = req.query;
  const inicio = new Date(year, month - 1, 1);
  const fim = new Date(year, month, 1);

  const leituras = await Leitura.find({
    medidorId: mongoose.Types.ObjectId(medidorId),
    timestamp: { $gte: inicio, $lt: fim }
  }).sort('timestamp');

  await Audit.create({
    user: req.user.id,
    rota: '/api/relatorios/mensal',
    metodo: 'relatorioMensal',
    params: { medidorId, year, month }
  });

  res.json(leituras);
};
