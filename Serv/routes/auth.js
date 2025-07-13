const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

router.post('/login',  ctrl.login);
//router.post('/register', verificaToken, apenasAdmin, ctrl.register);
depois comentar e descomentar a linha acima e o cons{ver...
//router.post('/register', ctrl.register);
module.exports = router;
