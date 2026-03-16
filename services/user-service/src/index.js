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
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

const app = express();
const PORT = process.env.USER_PORT || 3006;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

function getRiskLabel(score) {
  if (score <= 33) return 'Conservative';
  if (score <= 66) return 'Moderate';
  return 'Aggressive';
}

// GET /user/me
app.get('/user/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /user/me
app.put('/user/me', verifyToken, async (req, res) => {
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /user/fcm-token
app.post('/user/fcm-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    await pool.query(
      'UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE firebase_uid = $2',
      [token, req.user.uid]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update FCM token error:', error);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

// GET /user/risk-score
app.get('/user/risk-score', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT risk_score, segment FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { risk_score, segment } = result.rows[0];

    res.status(200).json({
      risk_score,
      segment,
      label: getRiskLabel(risk_score),
    });
  } catch (error) {
    console.error('Get risk score error:', error);
    res.status(500).json({ error: 'Failed to fetch risk score' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'user-service' });
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
