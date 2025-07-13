const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

router.use(verificaToken, apenasAdmin);

router.get('/',       ctrl.listUsers);
router.get('/:id',    ctrl.getUser);
router.post('/',      ctrl.createUser);
router.put('/:id',    ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

module.exports = router;
