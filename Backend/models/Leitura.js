const mongoose = require('mongoose');

const LeituraSchema = new mongoose.Schema({
  medidorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medidor', required: true },
  consumoDiario: Number,
  consumoMensal: Number,
  latitude: Number,
  longitude: Number,
  bateria: Number,
  rssi: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leitura', LeituraSchema);
