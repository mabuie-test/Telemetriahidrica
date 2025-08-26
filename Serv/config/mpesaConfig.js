// backend/config/mpesaConfig.js
module.exports = {
  apiKey: process.env.MPESA_API_KEY || '',
  publicKey: process.env.MPESA_PUBLIC_KEY || '', // PEM ou base64 raw
  serviceProviderCode: process.env.MPESA_SERVICE_CODE || '', // shortcode / SP code
  env: process.env.MPESA_ENV || 'sandbox', // 'sandbox' ou 'production'/'live'
  // baseURL usado no controller apenas se precisares sobrescrever; Transaction também monta baseUrl
  // Recomendo deixar vazio e usar Transaction (que monta host+porta)
  baseURL: process.env.MPESA_BASE_URL || '',

  // Callback URL que registas no portal Vodacom (opcional usar no controller)
  callbackUrl: process.env.MPESA_CALLBACK_URL || ''
};
