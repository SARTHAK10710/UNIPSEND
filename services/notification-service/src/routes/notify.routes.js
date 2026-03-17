const express = require('express');
const router = express.Router();
const notifyController = require('../controllers/notifyController');

router.post('/single', notifyController.sendSingle);
router.post('/budget-alert', notifyController.sendBudgetAlert);
router.post('/renewal', notifyController.sendRenewal);
router.post('/investment', notifyController.sendInvestmentUpdate);
router.post('/bulk', notifyController.sendBulk);
router.post('/ai-insight', notifyController.sendAIInsight);

module.exports = router;
