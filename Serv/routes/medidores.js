const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/medidorController');
const { verificaToken, apenasAdmin } = require('../middleware/auth');

router.use(verificaToken, apenasAdmin);

router.get('/',       ctrl.listMedidores);
router.get('/:id',    ctrl.getMedidor);
router.post('/',      ctrl.createMedidor);
router.put('/:id',    ctrl.updateMedidor);
router.delete('/:id', ctrl.deleteMedidor);

module.exports = router;
