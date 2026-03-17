const express = require('express');
const router = express.Router();
const alpacaController = require('../controllers/alpacaController');

router.get('/account', alpacaController.getAccount);
router.get('/portfolio', alpacaController.getPortfolio);
router.post('/order', alpacaController.placeOrder);
router.get('/orders', alpacaController.getOrders);

module.exports = router;
