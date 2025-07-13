const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rota:   String,
  metodo: String,
  params: mongoose.Schema.Types.Mixed,
  data:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
