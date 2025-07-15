const express = require('express');
const router  = express.Router();
const { login, register } = require('../controllers/authController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register — só Admin pode criar novos usuários
router.post(
  '/register',
  verificaToken,
  apenasAdmin,
  register
);

module.exports = router;
