const express = require('express');
const router = express.Router();
const plaidClient = require('../plaidClient');

// GET /api/plaid/balance/:userId — get account balances
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const itemResult = await req.db.query(
      'SELECT access_token FROM plaid_items WHERE user_id = $1',
      [userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'No linked bank account found' });
    }

    let allAccounts = [];

    for (const item of itemResult.rows) {
      const response = await plaidClient.accountsGet({
        access_token: item.access_token,
      });
      allAccounts = allAccounts.concat(response.data.accounts);
    }

    const balances = allAccounts.map((acc) => ({
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
    console.error('Get balance error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

module.exports = router;
