const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome:    { type: String, required: true },
  email:   { type: String, required: true, unique: true },
  senha:   { type: String, required: true },
  papel:   { type: String, enum: ['admin','cliente'], required: true },
  medidor: { type: mongoose.Schema.Types.ObjectId, ref: 'Medidor' }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
