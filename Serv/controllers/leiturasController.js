const Leitura  = require('../models/Leitura');
const Audit    = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * POST /api/leituras
 * Cria uma nova leitura, aplicando defaults em campos numéricos
 * e gravando um log de auditoria.
 */
exports.createLeitura = async (req, res) => {
  try {
    const {
      medidorId,
      consumoDiario = 0,
      consumoMensal = 0,
      latitude,
      longitude,
      bateria = 0,
      rssi = 0,
      token
    } = req.body;

    if (!medidorId) {
      return res.status(400).json({ error: 'Campo medidorId é obrigatório.' });
    }

    const leituraData = {
      medidorId: new mongoose.Types.ObjectId(medidorId),
      consumoDiario: Number(consumoDiario) || 0,
      consumoMensal: Number(consumoMensal) || 0,
      bateria: Number(bateria) || 0,
      rssi: Number(rssi) || 0,
      timestamp: new Date()
    };

    if (latitude != null && longitude != null) {
      leituraData.latitude  = Number(latitude);
      leituraData.longitude = Number(longitude);
    }

    const leitura = await Leitura.create(leituraData);

    await Audit.create({
      user:   req.user?.id || token || 'dispositivo',
      rota:   '/api/leituras',
      metodo: 'createLeitura',
      params: leituraData
    });

    res.status(201).json(leitura);
  } catch (err) {
    console.error('createLeitura error:', err);
    res.status(500).json({ error: 'Erro ao criar leitura.' });
  }
};

/**
 * GET /api/leituras
 * Lista as últimas 100 leituras.
 */
exports.listLeituras = async (req, res) => {
  try {
    const leituras = await Leitura.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(leituras);
  } catch (err) {
    console.error('listLeituras error:', err);
    res.status(500).json({ error: 'Erro ao listar leituras.' });
  }
};
