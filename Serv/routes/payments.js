// backend/routes/payments.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentsController');
const { verificaToken } = require('../middleware/auth');

/**
 * Inicia pagamento — protegido (cliente autenticado)
 */
router.post('/mpesa', verificaToken, ctrl.initiateMpesa);

/**
 * Callback público da Vodacom (sem auth)
 *
 * Usamos express.raw para receber o corpo cru e tentamos fazer JSON.parse.
 * Se não for JSON, guardamos o raw em req.body._raw para posterior análise.
 */
router.post(
  '/mpesa/callback',
  express.raw({ type: '*/*', limit: '1mb' }),
  (req, res, next) => {
    // tenta converter em string e fazer parse JSON
    try {
      const txt = req.body && req.body.toString ? req.body.toString('utf8') : '';
      if (txt) {
        try {
          req.body = JSON.parse(txt);
        } catch (e) {
          // não é JSON — deixa o raw para o controller (útil para debugging)
          req.body = { _raw: txt };
        }
      } else {
        req.body = {};
      }
    } catch (err) {
      req.body = { _raw: '<error reading body>' };
    }
    next();
  },
  ctrl.mpesaCallback
);

module.exports = router;
