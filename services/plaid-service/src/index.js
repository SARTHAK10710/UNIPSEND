const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const Redis = require('ioredis');
const admin = require('firebase-admin');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const verifyToken = require('./middleware/verifyToken');
const plaidClient = require('./plaidClient');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

const app = express();
const PORT = process.env.PLAID_PORT || 3002;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use((req, res, next) => {
  req.db = pool;
  req.redis = redis;
  next();
});

// POST /api/plaid/link-token
app.post('/api/plaid/link-token', verifyToken, async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      client_name: 'Unispend',
      user: { client_user_id: req.user.uid },
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    console.log('[Plaid] link token created successfully');
    res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('[Plaid] link token error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create link token',
      details: error.response?.data || error.message,
    });
  }
});

// POST /api/plaid/exchange-token
app.post('/api/plaid/exchange-token', verifyToken, async (req, res) => {
  try {
    const { public_token } = req.body;

    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;

    await pool.query(
      `UPDATE users
       SET plaid_access_token = $1, plaid_item_id = $2, updated_at = NOW()
       WHERE firebase_uid = $3`,
      [access_token, item_id, req.user.uid]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Exchange token error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// GET /api/plaid/transactions
app.get('/api/plaid/transactions', verifyToken, async (req, res) => {
  try {
    const cacheKey = 'transactions:' + req.user.uid;

    if (req.query.refresh !== 'true') {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('[Plaid] returning cached transactions');
        return res.status(200).json(JSON.parse(cached));
      }
    }

    const userResult = await pool.query(
      'SELECT plaid_access_token FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (!userResult.rows[0]?.plaid_access_token) {
      return res.status(200).json({
        transactions: [],
        count: 0,
        connected: false,
        message: 'No bank connected',
      });
    }

    const accessToken = userResult.rows[0].plaid_access_token;
    console.log('[Plaid] fetching transactions with cursor loop...');

    // CURSOR LOOP - fetches ALL transactions
    let cursor = null;
    let allTransactions = [];
    let hasMore = true;
    let iterations = 0;

    while (hasMore && iterations < 10) {
      const request = { access_token: accessToken };
      if (cursor) request.cursor = cursor;

      const response = await plaidClient.transactionsSync(request);

      console.log('[Plaid] iteration', iterations,
        'added:', response.data.added.length,
        'has_more:', response.data.has_more);

      allTransactions = [
        ...allTransactions,
        ...response.data.added,
      ];

      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
      iterations++;
    }

    console.log('[Plaid] total transactions fetched:', allTransactions.length);

    // store cursor in redis for incremental sync
    if (cursor) {
      await redis.set('plaid_cursor:' + req.user.uid, cursor);
    }

    // store in postgres
    for (const txn of allTransactions) {
      await pool.query(
        `INSERT INTO transactions
         (firebase_uid, plaid_transaction_id, amount, category, subcategory, merchant_name, date, account_id, pending)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (plaid_transaction_id) DO UPDATE SET
           amount = EXCLUDED.amount,
           pending = EXCLUDED.pending`,
        [
          req.user.uid,
          txn.transaction_id,
          txn.amount,
          txn.personal_finance_category?.primary || txn.category?.[0] || 'GENERAL_MERCHANDISE',
          txn.personal_finance_category?.detailed || txn.category?.[1] || null,
          txn.merchant_name || txn.name || null,
          txn.date,
          txn.account_id || null,
          txn.pending || false,
        ]
      );
    }

    const result = await pool.query(
      'SELECT * FROM transactions WHERE firebase_uid = $1 ORDER BY date DESC',
      [req.user.uid]
    );

    const payload = {
      transactions: result.rows,
      count: result.rows.length,
      connected: true,
    };

    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 300);

    res.status(200).json(payload);
  } catch (error) {
    console.error('[Plaid] transactions error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message,
    });
  }
});

// GET /api/plaid/balance
app.get('/api/plaid/balance', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT plaid_access_token FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].plaid_access_token) {
      return res.status(200).json({ accounts: [], message: 'No bank connected' });
    }

    const response = await plaidClient.accountsGet({
      access_token: userResult.rows[0].plaid_access_token,
    });

    const accounts = response.data.accounts.map((acc) => ({
      account_id: acc.account_id,
      name: acc.name,
      official_name: acc.official_name,
      type: acc.type,
      subtype: acc.subtype,
      available: acc.balances.available,
      current: acc.balances.current,
      currency: acc.balances.iso_currency_code,
    }));

    res.status(200).json({ accounts });
  } catch (error) {
    console.error('Get balance error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// POST /api/plaid/processor-token
app.post('/api/plaid/processor-token', verifyToken, async (req, res) => {
  try {
    const { account_id, processor } = req.body;

    const userResult = await pool.query(
      'SELECT plaid_access_token FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].plaid_access_token) {
      return res.status(404).json({ error: 'No linked bank account found' });
    }

    const response = await plaidClient.processorTokenCreate({
      access_token: userResult.rows[0].plaid_access_token,
      account_id,
      processor,
    });

    res.status(200).json({ processor_token: response.data.processor_token });
  } catch (error) {
    console.error('Create processor token error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to create processor token' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'plaid' });
});

// 404 handler
app.use((req, res) => {
  res.status(200).json({ status: 'ok', message: `Route ${req.method} ${req.path} not found (swallowed)` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR NOT NULL,
        plaid_transaction_id VARCHAR UNIQUE,
        merchant_name VARCHAR,
        amount DECIMAL NOT NULL,
        category VARCHAR,
        subcategory VARCHAR,
        date DATE NOT NULL,
        account_id VARCHAR,
        pending BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Transactions table ready');
  } catch (err) {
    console.error('✗ Failed to create transactions table:', err.message);
  }
};

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Plaid Service running on port ${PORT}`);
  });
});
