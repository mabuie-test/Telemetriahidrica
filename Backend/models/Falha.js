const mongoose = require('mongoose');

const FalhaSchema = new mongoose.Schema({
  medidorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medidor', required: true },
  tipo: { type: String, enum: ['sem_consumo','vazamento','offline'], required: true },
  inicio: { type: Date, default: Date.now },
  fim: Date,
  detalhes: String
});

module.exports = mongoose.model('Falha', FalhaSchema);
