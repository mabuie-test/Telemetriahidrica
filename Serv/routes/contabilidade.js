const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contabilidadeController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// 0. Parâmetros de cobrança (GET e PATCH) — apenas Admin
router.get('/params',
  verificaToken, apenasAdmin,
  ctrl.getBillingParams
);
router.patch('/params',
  verificaToken, apenasAdmin,
  ctrl.setBillingParams
);

// 1. Geração em massa de faturas — apenas Admin
router.post('/bulk',
  verificaToken, apenasAdmin,
  ctrl.bulkGenerateInvoices
);

// 2. Listar todas faturas de um mês — apenas Admin
router.get('/all',
  verificaToken, apenasAdmin,
  ctrl.listAllInvoices
);

// 3. Listar faturas do próprio cliente
router.get('/client',
  verificaToken,
  ctrl.listClientInvoices
);

// 4. Gerar ou obter fatura individual (deprecated no frontend, mas mantido se precisares)
// router.get('/invoice', verificaToken, ctrl.getOrCreateInvoice);

// 5. Histórico de faturas individual (deprecated)
// router.get('/invoices', verificaToken, ctrl.listInvoices);

// 6. Pagamento de fatura
router.post('/pay',
  verificaToken,
  ctrl.payInvoice
);

// 7. Suspender/Reativar contador — apenas Admin
router.patch('/medidor/:id/suspend',
  verificaToken, apenasAdmin,
  ctrl.toggleSuspend
);

module.exports = router;
