const plaidClient = require("../plaidClient");

// Sync transactions from Plaid and save to DB
const getTransactions = async (req, res) => {
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
      return res.status(404).json({ error: "No linked bank account found" });
    }

    const accessToken = userResult.rows[0].plaid_access_token;

    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
    });

    const transactions = response.data.added || [];

    for (const txn of transactions) {
      await req.db.query(
        `INSERT INTO transactions
         (firebase_uid, plaid_transaction_id, amount, category, subcategory, merchant_name, date, account_id, pending)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (plaid_transaction_id) DO UPDATE SET
           amount = EXCLUDED.amount,
           pending = EXCLUDED.pending`,
        [
          firebaseUid,
          txn.transaction_id,
          Math.abs(txn.amount),
          txn.personal_finance_category?.primary ||
            txn.category?.[0] ||
            "Other",
          txn.personal_finance_category?.detailed || txn.category?.[1] || null,
          txn.merchant_name || null,
          txn.date,
          txn.account_id || null,
          txn.pending,
        ],
      );
    }

    res.status(200).json({
      message: `Synced ${transactions.length} transactions`,
      count: transactions.length,
    });
  } catch (error) {
    console.error("Get transactions error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// Get stored transactions from DB
const getStoredTransactions = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 50, offset = 0, category } = req.query;

    let query = "SELECT * FROM transactions WHERE firebase_uid = $1";
    const params = [firebaseUid];

    if (category) {
      query += " AND category = $2";
      params.push(category);
    }

    query +=
      " ORDER BY date DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    res
      .status(200)
      .json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Get stored transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

module.exports = { getTransactions, getStoredTransactions };
