const express = require('express');
const router = express.Router();
const { createProcessorToken } = require('../controllers/processorController');

// POST /api/plaid/processor/token — create processor token for third-party
router.post('/token', createProcessorToken);

module.exports = router;
