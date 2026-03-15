const plaidClient = require('../plaidClient');

// Create a processor token for ScribeUp / Cardlytics integrations
const createProcessorToken = async (req, res) => {
  try {
    const { userId, processor } = req.body;

    const itemResult = await req.db.query(
      'SELECT access_token FROM plaid_items WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'No linked bank account found' });
    }

    const accessToken = itemResult.rows[0].access_token;

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accountId = accountsResponse.data.accounts[0]?.account_id;

    if (!accountId) {
      return res.status(404).json({ error: 'No account found' });
    }

    const response = await plaidClient.processorTokenCreate({
      access_token: accessToken,
      account_id: accountId,
      processor: processor || 'dwolla',
    });

    res.status(200).json({ processor_token: response.data.processor_token });
  } catch (error) {
    console.error('Create processor token error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to create processor token' });
  }
};

module.exports = { createProcessorToken };
