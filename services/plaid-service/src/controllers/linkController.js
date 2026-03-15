const plaidClient = require('../plaidClient');
const { CountryCode, Products } = require('plaid');

// Create a Link token for the frontend
const createLinkToken = async (req, res) => {
  try {
    const { userId } = req.body;

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: String(userId) },
      client_name: 'UniSpend',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.In],
      language: 'en',
    });

    res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Create link token error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
};

// Exchange public_token for access_token and store in DB
const exchangeToken = async (req, res) => {
  try {
    const { publicToken, userId, institutionId, institutionName } = req.body;

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = response.data;

    await req.db.query(
      `INSERT INTO plaid_items (user_id, access_token, item_id, institution_id, institution_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (item_id) DO NOTHING`,
      [userId, access_token, item_id, institutionId || null, institutionName || null]
    );

    res.status(200).json({
      message: 'Bank linked successfully',
      item_id,
    });
  } catch (error) {
    console.error('Exchange token error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
};

module.exports = { createLinkToken, exchangeToken };
