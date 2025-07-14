const Leitura = require('../models/Leitura');
const Audit   = require('../models/AuditLog');
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

    // Verifica medidorId
    if (!medidorId) {
      return res.status(400).json({ error: 'Campo medidorId é obrigatório.' });
    }

    // Monta dados da leitura
    const leituraData = {
      medidorId: mongoose.Types.ObjectId(medidorId),
      consumoDiario: Number(consumoDiario) || 0,
      consumoMensal: Number(consumoMensal) || 0,
      bateria: Number(bateria) || 0,
      rssi: Number(rssi) || 0,
      timestamp: new Date(),
    };

    // Incluir localização apenas se ambos definidos
    if (latitude != null && longitude != null) {
      leituraData.latitude  = Number(latitude);
      leituraData.longitude = Number(longitude);
    }

    // Cria leitura
    const leitura = await Leitura.create(leituraData);

    // Auditoria
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
/opt/render/project/src/Serv/controllers/relatoriosController.js:17
    medidorId: mongoose.Types.ObjectId(medidorId),
                              ^
TypeError: Class constructor ObjectId cannot be invoked without 'new'
    at exports.relatorioDiario (/opt/render/project/src/Serv/controllers/relatoriosController.js:17:31)
    at Layer.handle [as handle_request] (/opt/render/project/src/Serv/node_modules/express/lib/router/layer.js:95:5)
    at next (/opt/render/project/src/Serv/node_modules/express/lib/router/route.js:149:13)
    at /opt/render/project/src/Serv/routes/relatorios.js:11:5
    at Layer.handle [as handle_request] (/opt/render/project/src/Serv/node_modules/express/lib/router/layer.js:95:5)
    at next (/opt/render/project/src/Serv/node_modules/express/lib/router/route.js:149:13)
    at verificaToken (/opt/render/project/src/Serv/middleware/auth.js:10:5)
    at Layer.handle [as handle_request] (/opt/render/project/src/Serv/node_modules/express/lib/router/layer.js:95:5)
    at next (/opt/render/project/src/Serv/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/opt/render/project/src/Serv/node_modules/express/lib/router/route.js:119:3)
Node.js v22.16.0const Leitura = require('../models/Leitura');
const Audit   = require('../models/AuditLog');
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

    // Verifica medidorId
    if (!medidorId) {
      return res.status(400).json({ error: 'Campo medidorId é obrigatório.' });
    }

    // Monta dados da leitura
    const leituraData = {
      medidorId: mongoose.Types.ObjectId(medidorId),
      consumoDiario: Number(consumoDiario) || 0,
      consumoMensal: Number(consumoMensal) || 0,
      bateria: Number(bateria) || 0,
      rssi: Number(rssi) || 0,
      timestamp: new Date(),
    };

    // Incluir localização apenas se ambos definidos
    if (latitude != null && longitude != null) {
      leituraData.latitude  = Number(latitude);
      leituraData.longitude = Number(longitude);
    }

    // Cria leitura
    const leitura = await Leitura.create(leituraData);

    // Auditoria
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
