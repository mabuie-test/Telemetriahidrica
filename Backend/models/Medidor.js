const mongoose = require('mongoose');

const MedidorSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  localizacao: {
    latitude: Number,
    longitude: Number
  },
  tokenDispositivo: { type: String, required: true }
});

module.exports = mongoose.model('Medidor', MedidorSchema);
