const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Pool } = require('pg');
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

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || undefined,
  host: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_HOST || 'localhost'),
  port: process.env.POSTGRES_URL ? undefined : (parseInt(process.env.POSTGRES_PORT, 10) || 5432),
  database: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_DB || 'unispend'),
  user: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_USER || 'admin'),
  password: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_PASSWORD || 'password'),
});

const app = express();
const PORT = process.env.USER_PORT || 3006;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR UNIQUE NOT NULL,
        email VARCHAR NOT NULL,
        first_name VARCHAR DEFAULT '',
        last_name VARCHAR DEFAULT '',
        plaid_access_token VARCHAR,
        plaid_item_id VARCHAR,
        risk_score INTEGER DEFAULT 50,
        segment VARCHAR DEFAULT 'balanced',
        fcm_token VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Users table ready');
  } catch (err) {
    console.error('✗ Failed to create users table:', err.message);
  }
};

function getRiskLabel(score) {
  if (score <= 33) return 'Conservative';
  if (score <= 66) return 'Moderate';
  return 'Aggressive';
}

// GET /api/user/me
app.get('/api/user/me', verifyToken, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (firebase_uid, email)
         VALUES ($1, $2)
         RETURNING *`,
        [req.user.uid, req.user.email]
      );
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/user/me
app.put('/api/user/me', verifyToken, async (req, res) => {
  try {
    const { first_name, last_name } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           updated_at = NOW()
       WHERE firebase_uid = $3
       RETURNING *`,
      [first_name, last_name, req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(200).json(null);
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/user/fcm-token
app.post('/api/user/fcm-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    await pool.query(
      'UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE firebase_uid = $2',
      [token, req.user.uid]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update FCM token error:', error.message);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

// GET /api/user/risk-score
app.get('/api/user/risk-score', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT risk_score, segment FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ risk_score: 50, segment: 'balanced', label: 'Moderate' });
    }

    const { risk_score, segment } = result.rows[0];
    res.status(200).json({
      risk_score,
      segment,
      label: getRiskLabel(risk_score),
    });
  } catch (error) {
    console.error('Get risk score error:', error.message);
    res.status(500).json({ error: 'Failed to fetch risk score' });
  }
});

// PUT /api/user/risk-score
app.put('/api/user/risk-score', verifyToken, async (req, res) => {
  try {
    const { risk_score, segment } = req.body;
    await pool.query(
      `UPDATE users SET risk_score = COALESCE($1, risk_score),
                        segment = COALESCE($2, segment),
                        updated_at = NOW()
       WHERE firebase_uid = $3`,
      [risk_score, segment, req.user.uid]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update risk score error:', error.message);
    res.status(500).json({ error: 'Failed to update risk score' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-service' });
});

// 404 handler
app.use((req, res) => {
  res.status(200).json({ status: 'ok', message: `Route ${req.method} ${req.path} not found (swallowed)` });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });
});
