// backend/utils/MpesaRequest.js
const axios = require('axios');
const Cryptor = require('./Cryptor');

const DEFAULT_TIMEOUT = 120000; // 120s

class MpesaRequest {
  constructor(apiKey, publicKey) {
    this.apiKey = apiKey;
    this.publicKey = publicKey;
    this.timeout = parseInt(process.env.MPESA_TIMEOUT_MS || DEFAULT_TIMEOUT, 10);
    this.debug = process.env.NODE_ENV !== 'production';
  }

  _headers(payload = null) {
    const auth = 'Bearer ' + Cryptor.token(this.publicKey, this.apiKey);
    const headers = {
      'Content-Type': 'application/json',
      'Origin': '*',
      'Authorization': auth
    };
    if (payload) {
      // usar byte length para Content-Length correto
      try {
        headers['Content-Length'] = Buffer.byteLength(JSON.stringify(payload));
      } catch (e) {
        // fallback simples
        headers['Content-Length'] = String(JSON.stringify(payload)).length;
      }
    }
    return headers;
  }

  // utilitária para log
  _log(...args) {
    if (this.debug) console.log('[MpesaRequest]', ...args);
  }

  // tentativa com 1 retry em erro de rede
  async _attempt(fn, attempts = 2) {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await fn();
        return { ok: true, data: result };
      } catch (ex) {
        lastErr = ex;
        // se for o último, vamos devolver info estruturada a seguir
        // espera um pouco antes do retry (1s)
        if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000));
      }
    }
    return { ok: false, error: lastErr };
  }

  async post(url, params) {
    this._log('POST', url, 'payloadLen=', params ? Buffer.byteLength(JSON.stringify(params)) : 0, 'timeout=', this.timeout);

    const attempt = await this._attempt(() =>
      axios.post(url, params, {
        headers: this._headers(params),
        timeout: this.timeout,
        validateStatus: () => true // deixamos o caller interpretar o body/status
      })
    );

    if (attempt.ok) {
      const resp = attempt.data;
      this._log('POST response status=', resp?.status || '(resp object)', 'dataPreview=', (resp && resp.data) ? JSON.stringify(resp.data).slice(0,200) : JSON.stringify(resp).slice(0,200));
      // axios retorna um objecto com .data quando ok
      return attempt.data.data ?? attempt.data;
    }

    const ex = attempt.error;
    this._log('POST error:', ex?.message || ex);

    // se o axios devolveu response com data, devolve-o (conteúdo do provedor)
    if (ex && ex.response && typeof ex.response.data !== 'undefined') {
      return ex.response.data;
    }

    // Normaliza a resposta de erro para o controller poder actuar
    return {
      error: ex?.code || 'NETWORK_ERROR',
      message: ex?.message || String(ex),
      status: ex?.response?.status || null
    };
  }

  async get(url, params) {
    this._log('GET', url, 'params=', params, 'timeout=', this.timeout);

    const attempt = await this._attempt(() =>
      axios.get(url, {
        headers: this._headers(),
        params,
        timeout: this.timeout,
        validateStatus: () => true
      })
    );

    if (attempt.ok) {
      const resp = attempt.data;
      this._log('GET response status=', resp?.status || '(resp object)', 'dataPreview=', (resp && resp.data) ? JSON.stringify(resp.data).slice(0,200) : JSON.stringify(resp).slice(0,200));
      return attempt.data.data ?? attempt.data;
    }

    const ex = attempt.error;
    this._log('GET error:', ex?.message || ex);

    if (ex && ex.response && typeof ex.response.data !== 'undefined') {
      return ex.response.data;
    }

    return {
      error: ex?.code || 'NETWORK_ERROR',
      message: ex?.message || String(ex),
      status: ex?.response?.status || null
    };
  }

  async put(url, params) {
    this._log('PUT', url, 'payloadLen=', params ? Buffer.byteLength(JSON.stringify(params)) : 0, 'timeout=', this.timeout);

    const attempt = await this._attempt(() =>
      axios.put(url, params, {
        headers: this._headers(params),
        timeout: this.timeout,
        validateStatus: () => true
      })
    );

    if (attempt.ok) {
      const resp = attempt.data;
      this._log('PUT response status=', resp?.status || '(resp object)', 'dataPreview=', (resp && resp.data) ? JSON.stringify(resp.data).slice(0,200) : JSON.stringify(resp).slice(0,200));
      return attempt.data.data ?? attempt.data;
    }

    const ex = attempt.error;
    this._log('PUT error:', ex?.message || ex);

    if (ex && ex.response && typeof ex.response.data !== 'undefined') {
      return ex.response.data;
    }

    return {
      error: ex?.code || 'NETWORK_ERROR',
      message: ex?.message || String(ex),
      status: ex?.response?.status || null
    };
  }
}

module.exports = MpesaRequest;
