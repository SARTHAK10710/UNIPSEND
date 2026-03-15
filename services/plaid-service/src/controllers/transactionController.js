const plaidClient = require('../plaidClient');

// Sync and fetch transactions from Plaid, save to DB
const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    const itemResult = await req.db.query(
      'SELECT access_token FROM plaid_items WHERE user_id = $1',
      [userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'No linked bank account found' });
    }

    let allTransactions = [];

    for (const item of itemResult.rows) {
      const response = await plaidClient.transactionsSync({
        access_token: item.access_token,
      });

      const transactions = response.data.added || [];

      for (const txn of transactions) {
        await req.db.query(
          `INSERT INTO transactions
           (user_id, plaid_transaction_id, amount, currency, category, subcategory, merchant_name, description, transaction_date, pending)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (plaid_transaction_id) DO UPDATE SET
             amount = EXCLUDED.amount,
             pending = EXCLUDED.pending`,
          [
            userId,
            txn.transaction_id,
            Math.abs(txn.amount),
            txn.iso_currency_code || 'USD',
            txn.personal_finance_category?.primary || txn.category?.[0] || 'Other',
            txn.personal_finance_category?.detailed || txn.category?.[1] || null,
            txn.merchant_name || null,
            txn.name,
            txn.date,
            txn.pending,
          ]
        );
      }

      allTransactions = allTransactions.concat(transactions);
    }

    res.status(200).json({
      message: `Synced ${allTransactions.length} transactions`,
      count: allTransactions.length,
    });
  } catch (error) {
    console.error('Get transactions error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Get stored transactions from DB
const getStoredTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, category } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [userId];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY transaction_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    res.status(200).json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Get stored transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

module.exports = { getTransactions, getStoredTransactions };
