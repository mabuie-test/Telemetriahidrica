const mongoose = require('mongoose');

const BillingParamsSchema = new mongoose.Schema({
  consumoMinimo: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  extra: {
    z: { type: Number, required: true }
  },
  multaPercent: { type: Number, required: true },
}, {
  timestamps: true
});

// Só haverá um documento
BillingParamsSchema.statics.getParams = async function() {
  let p = await this.findOne();
  if (!p) {
    p = await this.create({
      consumoMinimo: { x: 10, y: 5000 },
      extra:         { z: 600 },
      multaPercent:  0.1
    });
  }
  return p;
};

module.exports = mongoose.model('BillingParams', BillingParamsSchema);
