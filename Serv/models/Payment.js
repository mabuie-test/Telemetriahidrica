const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  invoice:     { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  method:      { type: String, enum: ['mpesa','emola'], required: true },
  amount:      { type: Number, required: true },
  timestamp:   { type: Date, default: Date.now },
  reference:   { type: String },   // ID da transação externa
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);
