const mongoose = require('mongoose');

const MedidorSchema = new mongoose.Schema({
  nome:            { type: String, required: true },   // ex.: "Medidor Furo A"
  cliente:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  localizacao: {
    latitude:      Number,
    longitude:     Number
  },
  tokenDispositivo:{ type: String, required: true },
  suspended:       { type: Boolean, default: false }   // se true, contador está suspenso
}, {
  timestamps: true
});

module.exports = mongoose.model('Medidor', MedidorSchema);
