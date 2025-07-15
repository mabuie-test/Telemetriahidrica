const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contabilidadeController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// Gera ou obtém fatura do mês (cliente ou admin)
router.get('/invoice',
  verificaToken,
  ctrl.getOrCreateInvoice
);

// Histórico de faturas
router.get('/invoices',
  verificaToken,
  ctrl.listInvoices
);

// Pagamento automático
router.post('/pay',
  verificaToken,
  ctrl.payInvoice
);

// Suspensão de contador (admin)
router.patch('/medidor/:id/suspend',
  verificaToken, apenasAdmin,
  ctrl.toggleSuspend
);

module.exports = router;
