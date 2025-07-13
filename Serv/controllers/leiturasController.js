const Leitura = require('../models/Leitura');

// POST /api/leituras
exports.createLeitura = async (req, res) => {
  try {
    const leitura = await Leitura.create(req.body);
    res.status(201).json(leitura);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/leituras
exports.listLeituras = async (req, res) => {
  try {
    const leituras = await Leitura.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(leituras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
