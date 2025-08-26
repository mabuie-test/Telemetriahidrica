// backend/utils/Cryptor.js
const crypto = require('crypto');

class Cryptor {
  /**
   * token(public_key, api_key)
   * - public_key: PEM string (com headers) ou base64 raw (sem headers)
   * - api_key: string
   * Retorna: base64(encrypt(api_key, public_key))
   */
  static token(public_key, api_key) {
    if (!public_key) throw new Error('Cryptor: public_key não fornecida');
    if (!api_key) throw new Error('Cryptor: api_key não fornecida');

    // obter DER buffer
    let derBuffer;
    if (public_key.includes('-----BEGIN')) {
      const begin = '-----BEGIN PUBLIC KEY-----';
      const end   = '-----END PUBLIC KEY-----';
      const start = public_key.indexOf(begin) + begin.length;
      const stop  = public_key.indexOf(end);
      const b64 = public_key.substring(start, stop).replace(/[\r\n\s]/g, '');
      derBuffer = Buffer.from(b64, 'base64');
    } else {
      // assume base64 raw
      derBuffer = Buffer.from(public_key.replace(/\s+/g, ''), 'base64');
    }

    // DER -> PEM format
    const pemBase64 = derBuffer.toString('base64');
    const formattedPem = pemBase64.match(/.{1,64}/g).join('\n');
    const pem = `-----BEGIN PUBLIC KEY-----\n${formattedPem}\n-----END PUBLIC KEY-----\n`;

    // create public key and encrypt
    const publicKeyObj = crypto.createPublicKey(pem);
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyObj,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      Buffer.from(api_key, 'utf8')
    );

    return encrypted.toString('base64');
  }

  // utilitário de id (do exemplo)
  static getId(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomString = '';
    for (let i = 0; i < length; i++) {
      randomString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomString;
  }
}

module.exports = Cryptor;
