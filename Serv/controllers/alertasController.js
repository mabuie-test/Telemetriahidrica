const Alerta = require('../models/Alerta');

// POST /api/alertas/violacao
exports.createAlerta = async (req, res) => {
  try {
    const alerta = await Alerta.create(req.body);
    res.status(201).json(alerta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/alertas
exports.listAlertas = async (req, res) => {
  const alertas = await Alerta.find()
    .sort({ data: -1 })
    .limit(100);
  res.json(alertas);
};
