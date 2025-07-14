const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/relatoriosController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// Diário (Admin + Cliente)
router.get(
  '/diario',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  ctrl.relatorioDiario
);

// Semanal (Admin + Cliente)
router.get(
  '/semanal',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  ctrl.relatorioSemanal
);

// Mensal (Admin + Cliente)
router.get(
  '/mensal',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  ctrl.relatorioMensal
);

// Consumo Total por Cliente (Admin)
router.get(
  '/consumo-clientes',
  verificaToken,
  apenasAdmin,
  ctrl.relatorioClientes
);

module.exports = router;
