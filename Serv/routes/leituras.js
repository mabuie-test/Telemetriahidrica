const express = require('express');
const router  = express.Router();
const { createLeitura, listLeituras } = require('../controllers/leiturasController');
const { autenticaDispositivo } = require('../middleware/auth');

// POST /api/leituras — autentica dispositivo e cria leitura
router.post('/', autenticaDispositivo, createLeitura);

// GET  /api/leituras — lista leituras, sem autenticação de dispositivo
router.get('/', listLeituras);

module.exports = router;
