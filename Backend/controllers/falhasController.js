const Falha = require('../models/Falha');

// GET /api/falhas
exports.listFalhas = async (req, res) => {
  try {
    const falhas = await Falha.find()
      .sort({ inicio: -1 })
      .limit(100);
    res.json(falhas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// (Opcional) função para criar falha automática via cron job
