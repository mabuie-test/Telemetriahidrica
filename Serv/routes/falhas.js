const express = require('express');
const router  = express.Router();
const { listFalhas } = require('../controllers/falhasController');

router.get('/', listFalhas);

module.exports = router;
