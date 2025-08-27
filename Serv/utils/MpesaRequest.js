// backend/utils/MpesaRequest.js
const axios = require('axios');
const Cryptor = require('./Cryptor');

class MpesaRequest {
  constructor(apiKey, publicKey) {
    this.apiKey = apiKey;
    this.publicKey = publicKey;
  }

  _headers(payload = null) {
    const auth = 'Bearer ' + Cryptor.token(this.publicKey, this.apiKey);
    const headers = {
      'Content-Type': 'application/json',
      'Origin': '*',
      'Authorization': auth
    };
    if (payload) headers['Content-Length'] = JSON.stringify(payload).length;
    return headers;
  }

  async post(url, params) {
    try {
      const resp = await axios.post(url, params, {
        headers: this._headers(params),
        timeout: 20000
      });
      return resp.data;
    } catch (ex) {
      if (ex.response && typeof ex.response.data !== 'undefined') {
        return ex.response.data;
      }
      throw ex;
    }
  }

  async get(url, params) {
    try {
      const resp = await axios.get(url, { params, headers: this._headers() });
      return resp.data;
    } catch (ex) {
      if (ex.response && typeof ex.response.data !== 'undefined') {
        return ex.response.data;
      }
      throw ex;
    }
  }

  async put(url, params) {
    try {
      const resp = await axios.put(url, params, {
        headers: this._headers(params),
        timeout: 120000
      });
      return resp.data;
    } catch (ex) {
      if (ex.response && typeof ex.response.data !== 'undefined') {
        return ex.response.data;
      }
      throw ex;
    }
  }
}

module.exports = MpesaRequest;
