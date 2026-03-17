const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.get('/price/:symbol', marketController.getPrice);
router.get('/history/:symbol', marketController.getHistory);
router.get('/search/:query', marketController.searchSymbol);
router.get('/movers', marketController.getMovers);

module.exports = router;
