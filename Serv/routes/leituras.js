const express = require('express');
const router  = express.Router();
const { createLeitura, listLeituras } = require('../controllers/leiturasController');
const { autenticaDispositivo } = require('../middleware/auth');

router.post('/', autenticaDispositivo, createLeitura);
router.get('/', listLeituras);

module.exports = router;
