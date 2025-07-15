const express = require('express');
const router  = express.Router();

// Importa diretamente as funções para garantir que não ficam undefined
const { login, register } = require('../controllers/authController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

// POST /api/auth/login
// - login deve ser uma função exportada em authController.js
router.post('/login', login);

// POST /api/auth/register
// - protegido por token + apenasAdmin
// - register deve ser uma função exportada em authController.js
router.post(
  '/register',
  verificaToken,
  apenasAdmin,
  register
);

module.exports = router;
