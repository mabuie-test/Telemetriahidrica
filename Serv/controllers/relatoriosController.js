const Leitura  = require('../models/Leitura');
const Medidor  = require('../models/Medidor');
const User     = require('../models/User');
const Audit    = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * Relatório Diário de um Medidor (já existente)
 */
exports.relatorioDiario = async (req, res) => {
  const { medidorId, date } = req.query;
  const dataInicio = new Date(date);
  const dataFim    = new Date(date);
  dataFim.setDate(dataFim.getDate() + 1);

  const leituras = await Leitura.find({
    medidorId: mongoose.Types.ObjectId(medidorId),
    timestamp: { $gte: dataInicio, $lt: dataFim }
  }).sort('timestamp');

  await Audit.create({
    user:   req.user.id,
    rota:   '/api/relatorios/diario',
    metodo: 'relatorioDiario',
    params: { medidorId, date }
  });

  res.json(leituras);
};

/**
 * Relatório Mensal de um Medidor (já existente)
 */
exports.relatorioMensal = async (req, res) => {
  const { medidorId, year, month } = req.query;
  const inicio = new Date(year, month - 1, 1);
  const fim    = new Date(year, month, 1);

  const leituras = await Leitura.find({
    medidorId: mongoose.Types.ObjectId(medidorId),
    timestamp: { $gte: inicio, $lt: fim }
  }).sort('timestamp');

  await Audit.create({
    user:   req.user.id,
    rota:   '/api/relatorios/mensal',
    metodo: 'relatorioMensal',
    params: { medidorId, year, month }
  });

  res.json(leituras);
};

/**
 * NOVO: Relatório de Consumo total por Cliente
 * GET /api/relatorios/consumo-clientes?date=YYYY-MM-DD&year=&month=
 * - Se query.date fornecida, calcula consumo diário de cada cliente nessa data.
 * - Se query.year+query.month fornecidos, calcula consumo mensal.
 * - Se nenhum, devolve consumo acumulado geral.
 */
exports.relatorioClientes = async (req, res) => {
  const { date, year, month } = req.query;
  let match = {};

  if (date) {
    const d0 = new Date(date);
    const d1 = new Date(date);
    d1.setDate(d1.getDate() + 1);
    match = { timestamp: { $gte: d0, $lt: d1 } };
  } else if (year && month) {
    const inicio = new Date(year, month - 1, 1);
    const fim    = new Date(year, month, 1);
    match = { timestamp: { $gte: inicio, $lt: fim } };
  }
  // Pipeline de agregação
  const pipeline = [
    { $match: match },
    // Agrupar por medidor
    { $group: {
        _id: '$medidorId',
        totalDiario: { $sum: '$consumoDiario' },
        totalMensal: { $sum: '$consumoMensal' }
    }},
    // Associar dados do medidor e do cliente
    { $lookup: {
        from: 'medidors',
        localField: '_id',
        foreignField: '_id',
        as: 'medidor'
    }},
    { $unwind: '$medidor' },
    { $lookup: {
        from: 'users',
        localField: 'medidor.cliente',
        foreignField: '_id',
        as: 'cliente'
    }},
    { $unwind: '$cliente' },
    // Formatar saída
    { $project: {
        clienteId:    '$cliente._id',
        nomeCliente:  '$cliente.nome',
        medidorId:    '$_id',
        totalDiario:  1,
        totalMensal:  1
    }}
  ];

  const resultados = await Leitura.aggregate(pipeline);

  // Auditoria
  await Audit.create({
    user:   req.user.id,
    rota:   '/api/relatorios/consumo-clientes',
    metodo: 'relatorioClientes',
    params: { date, year, month }
  });

  res.json(resultados);
};
