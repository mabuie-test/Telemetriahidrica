// backend/utils/mpesaAuth.js
const Cryptor = require('./Cryptor');
const config = require('../config/mpesaConfig');

function generateBearerFromApiKey() {
  const apiKey = config.apiKey;
  const publicKey = config.publicKey;
  if (!apiKey || !publicKey) {
    throw new Error('MPESA apiKey ou publicKey não definidos no config.');
  }
  return Cryptor.token(publicKey, apiKey);
}

module.exports = { generateBearerFromApiKey };
