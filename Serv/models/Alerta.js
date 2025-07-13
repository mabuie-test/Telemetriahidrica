const mongoose = require('mongoose');

const AlertaSchema = new mongoose.Schema({
  medidorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medidor', required: true },
  tipo:      { type: String, enum: ['violacao_tampa','diagnostico_critico'], required: true },
  data:      { type: Date, default: Date.now },
  latitude:  Number,
  longitude: Number,
  detalhes:  mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Alerta', AlertaSchema);
