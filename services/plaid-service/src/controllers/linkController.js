const plaidClient = require("../plaidClient");
const { CountryCode, Products } = require("plaid");

// Create a Link token for the frontend
const createLinkToken = async (req, res) => {
  try {
    const { firebase_uid } = req.body;

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: String(firebase_uid) },
      client_name: "UniSpend",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.In],
      language: "en",
    });

    res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    console.error("Create link token error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to create link token" });
  }
};

// Exchange public_token for access_token and store on users table
const exchangeToken = async (req, res) => {
  try {
    const { public_token, firebase_uid } = req.body;

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    await req.db.query(
      `UPDATE users
       SET plaid_access_token = $1, plaid_item_id = $2, updated_at = NOW()
       WHERE firebase_uid = $3`,
      [access_token, item_id, firebase_uid],
    );

    res.status(200).json({
      message: "Bank linked successfully",
      item_id,
    });
  } catch (error) {
    console.error("Exchange token error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to exchange token" });
  }
};

module.exports = { createLinkToken, exchangeToken };
