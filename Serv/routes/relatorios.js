const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/relatoriosController');
const { verificaToken, apenasAdmin, apenasCliente } = require('../middleware/auth');

// Diário e Mensal (Admin + Cliente limitado ao seu medidor)
router.get('/diario',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  ctrl.relatorioDiario
);

router.get('/mensal',
  verificaToken,
  (req, res, next) => {
    if (req.user.papel === 'cliente') req.query.medidorId = req.user.medidor;
    next();
  },
  ctrl.relatorioMensal
);

// **Novo** Consumo Total por Cliente (Apenas Admin)
router.get('/consumo-clientes',
  verificaToken,
  apenasAdmin,
  ctrl.relatorioClientes
);

module.exports = router;
