const Falha = require('../models/Falha');

// GET /api/falhas
exports.listFalhas = async (req, res) => {
  const falhas = await Falha.find()
    .sort({ inicio: -1 })
    .limit(100);
  res.json(falhas);
};
