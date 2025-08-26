// backend/config/mpesaConfig.js
require('dotenv').config();

module.exports = {
  apiKey: process.env.MPESA_API_KEY,            // API Key (string de 32 chars)
  publicKey: process.env.MPESA_PUBLIC_KEY,      // Chave pública (PEM ou base64) fornecida pela Vodacom
  serviceProviderCode: process.env.MPESA_SERVICE_CODE, // shortcode / service provider code
  baseURL: process.env.MPESA_BASE_URL || 'https://sandbox.vm.co.mz/mpesa/ipg/v1', // colocar base correcta do sandbox/live
  env: process.env.MPESA_ENV || 'sandbox'
};
