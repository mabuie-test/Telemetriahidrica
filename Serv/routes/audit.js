const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auditController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// Listar todos os logs de auditoria (apenas Admin)
router.get('/',
  verificaToken,
  apenasAdmin,
  ctrl.listarAuditLogs
);

module.exports = router;

