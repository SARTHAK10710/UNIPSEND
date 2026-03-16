const express = require("express");
const router = express.Router();
const plaidClient = require("../plaidClient");

// GET /api/plaid/balance/:firebaseUid — get account balances
router.get("/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const userResult = await req.db.query(
      "SELECT plaid_access_token FROM users WHERE firebase_uid = $1",
      [firebaseUid],
    );

    if (
      userResult.rows.length === 0 ||
      !userResult.rows[0].plaid_access_token
    ) {
      return res.status(200).json({ data: [], error: placeholder, message: "No linked bank account found" });
    }

    const response = await plaidClient.accountsGet({
      access_token: userResult.rows[0].plaid_access_token,
    });

    const balances = response.data.accounts.map((acc) => ({
      account_id: acc.account_id,
      name: acc.name,
      official_name: acc.official_name,
      type: acc.type,
      subtype: acc.subtype,
      available: acc.balances.available,
      current: acc.balances.current,
      currency: acc.balances.iso_currency_code,
    }));

    res.status(200).json({ accounts: balances });
  } catch (error) {
    console.error("Get balance error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to fetch balances" });
  }
});

module.exports = router;
