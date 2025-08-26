// backend/models/Invoice.js
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  medidor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medidor', required: true },
  year:        { type: Number, required: true },
  month:       { type: Number, required: true },
  consumo:     { type: Number, required: true },   // m³ total no mês
  valorBase:   { type: Number, required: true },   // Y
  valorExtra:  { type: Number, required: true },   // (consumo-X)*Z
  multa:       { type: Number, default: 0 },       // mora de faturas em dívida
  total:       { type: Number, required: true },   // soma de tudo
  status:      { type: String, enum: ['pendente','paga','suspenso'], default: 'pendente' },
  transactionId:{ type: String },                  // ID retornado pela operadora (ex: Mpesa)
  paymentMethod:{ type: String, enum: ['mpesa','emola', null], default: null },
  createdAt:   { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: true },
  toObject:{ virtuals: true }
});

InvoiceSchema.index({ medidor:1, year:1, month:1 }, { unique: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
