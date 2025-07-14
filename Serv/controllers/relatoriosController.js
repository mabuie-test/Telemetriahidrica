// controllers/relatoriosController.js

const Leitura  = require('../models/Leitura');
const Audit    = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * Relatório Diário
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
 * Relatório Semanal
 */
exports.relatorioSemanal = async (req, res) => {
  try {
    const { medidorId, date } = req.query;
    const dataInicio = new Date(date);
    const dataFim    = new Date(date);
    dataFim.setDate(dataFim.getDate() + 7);

    const leituras = await Leitura.find({
      medidorId: mongoose.Types.ObjectId(medidorId),
      timestamp: { $gte: dataInicio, $lt: dataFim }
    }).sort('timestamp');

    await Audit.create({
      user:   req.user.id,
      rota:   '/api/relatorios/semanal',
      metodo: 'relatorioSemanal',
      params: { medidorId, date }
    });

    res.json(leituras);
  } catch (err) {
    console.error('relatorioSemanal error:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório semanal.' });
  }
};

/**
 * Relatório Mensal
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
 * Consumo Total por Cliente
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

  const pipeline = [
    { $match: match },
    { $group: {
        _id: '$medidorId',
        totalDiario: { $sum: '$consumoDiario' },
        totalMensal: { $sum: '$consumoMensal' }
    }},
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
    { $project: {
        clienteId:    '$cliente._id',
        nomeCliente:  '$cliente.nome',
        medidorId:    '$_id',
        totalDiario:  1,
        totalMensal:  1
    }}
  ];

  const resultados = await Leitura.aggregate(pipeline);

  await Audit.create({
    user:   req.user.id,
    rota:   '/api/relatorios/consumo-clientes',
    metodo: 'relatorioClientes',
    params: { date, year, month }
  });

  res.json(resultados);
};
