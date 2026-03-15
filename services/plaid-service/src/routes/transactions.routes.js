const express = require('express');
const router = express.Router();
const { getTransactions, getStoredTransactions } = require('../controllers/transactionController');

// POST /api/plaid/transactions/sync/:userId — sync from Plaid
router.post('/sync/:userId', getTransactions);

// GET /api/plaid/transactions/:userId — get stored transactions from DB
router.get('/:userId', getStoredTransactions);

module.exports = router;
