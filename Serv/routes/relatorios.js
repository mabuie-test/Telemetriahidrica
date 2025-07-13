const express = require('express');
const router  = express.Router();
const { relatorioDiario, relatorioMensal } = require('../controllers/relatoriosController');
const { verificaToken, apenasAdmin, apenasCliente } = require('../middleware/auth');

// Admin pode qualquer; cliente apenas do seu medidor
router.get('/diario',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  relatorioDiario
);

router.get('/mensal',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  relatorioMensal
);

module.exports = router;
