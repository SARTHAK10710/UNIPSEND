const express = require("express");
const router = express.Router();
const {
  getTransactions,
  getStoredTransactions,
} = require("../controllers/transactionController");

// POST /api/plaid/transactions/sync/:firebaseUid — sync from Plaid
router.post("/sync/:firebaseUid", getTransactions);

// GET /api/plaid/transactions/:firebaseUid — get stored transactions from DB
router.get("/:firebaseUid", getStoredTransactions);

module.exports = router;
