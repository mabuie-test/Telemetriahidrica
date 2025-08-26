// backend/utils/mpesaAuth.js
const crypto = require('crypto');
const { apiKey, publicKey } = require('../config/mpesaConfig');

function toPem(base64Key) {
  // quebra em linhas de 64 chars e adiciona header/footer
  const chunkSize = 64;
  const chunks = base64Key.match(new RegExp('.{1,' + chunkSize + '}', 'g')) || [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
}

function normalizePublicKey(key) {
  if (!key) throw new Error('MPESA public key não definida');
  if (key.includes('-----BEGIN PUBLIC KEY-----')) return key;
  // assume base64 string -> transforma para PEM
  return toPem(key.replace(/\s+/g, ''));
}

function generateBearerFromApiKey() {
  const pem = normalizePublicKey(publicKey);
  const buffer = Buffer.from(apiKey, 'utf8');
  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer
  );
  return encrypted.toString('base64'); // este é o "Authorization: Bearer <aqui>"
}

module.exports = { generateBearerFromApiKey, normalizePublicKey };
