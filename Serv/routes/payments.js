// backend/routes/payments.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentsController');
const { verificaToken } = require('../middleware/auth');

// Inicia pagamento — protegido (cliente autenticado)
router.post('/mpesa', verificaToken, ctrl.initiateMpesa);

// Callback público da Vodacom (sem auth)
router.post('/mpesa/callback', express.json(), ctrl.mpesaCallback);

module.exports = router;
