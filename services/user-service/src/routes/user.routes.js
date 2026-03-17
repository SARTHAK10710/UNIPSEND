const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.delete('/account', userController.deleteAccount);

router.post('/fcm-token', userController.saveFCMToken);

router.get('/risk-score', userController.getRiskScore);
router.put('/risk-score', userController.updateRiskScore);

module.exports = router;
