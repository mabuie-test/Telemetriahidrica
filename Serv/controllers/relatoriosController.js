const Leitura  = require('../models/Leitura');
const Audit    = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * Relatório Semanal de um Medidor
 * GET /api/relatorios/semanal?date=YYYY-MM-DD
 * - Se query.date fornecida, calcula leituras desde essa data até +7 dias.
 * - Para cliente, força medidorId vindo do token.
 */
exports.relatorioSemanal = async (req, res) => {
  try {
    const { medidorId, date } = req.query;
    // Data de início
    const dataInicio = new Date(date);
    // Fim = 7 dias depois
    const dataFim = new Date(date);
    dataFim.setDate(dataFim.getDate() + 7);

    // Busca leituras nesse intervalo
    const leituras = await Leitura.find({
      medidorId: mongoose.Types.ObjectId(medidorId),
      timestamp: { $gte: dataInicio, $lt: dataFim }
    }).sort('timestamp');

    // Registra auditoria
    await Audit.create({
      user:   req.user.id,
      rota:   '/api/relatorios/semanal',
      metodo: 'relatorioSemanal',
      params: { medidorId, date }
    });

    return res.json(leituras);
  } catch (err) {
    console.error('Erro em relatorioSemanal:', err);
    return res.status(500).json({ error: 'Erro ao gerar relatório semanal.' });
  }
};
