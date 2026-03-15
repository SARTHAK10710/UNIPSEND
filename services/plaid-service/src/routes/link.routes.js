const express = require('express');
const router = express.Router();
const { createLinkToken, exchangeToken } = require('../controllers/linkController');

// POST /api/plaid/link/token — create link token
router.post('/token', createLinkToken);

// POST /api/plaid/link/exchange — exchange public token for access token
router.post('/exchange', exchangeToken);

module.exports = router;
