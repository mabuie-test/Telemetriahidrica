const express = require('express');
const router  = express.Router();
const { createAlerta, listAlertas } = require('../controllers/alertasController');
const autenticaDispositivo = require('../middleware/auth');

router.post('/violacao', autenticaDispositivo, createAlerta);
router.get('/', listAlertas);

module.exports = router;
