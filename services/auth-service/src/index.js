const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { Pool } = require('pg');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || undefined,
  host: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_HOST || 'localhost'),
  port: process.env.POSTGRES_URL ? undefined : (parseInt(process.env.POSTGRES_PORT, 10) || 5432),
  database: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_DB || 'unispend'),
  user: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_USER || 'admin'),
  password: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_PASSWORD || 'password'),
});

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || '',
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
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

const registerUser = async (uid, email, name) => {
  const result = await pool.query(
    `INSERT INTO users (firebase_uid, email, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE
     SET email = EXCLUDED.email,
         updated_at = NOW()
     RETURNING *`,
    [uid, email, name || '']
  );
  return result.rows[0];
};

// POST /api/auth/register
app.post('/api/auth/register', verifyToken, async (req, res) => {
  try {
    const user = await registerUser(req.user.uid, req.user.email, req.user.name);
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      const user = await registerUser(req.user.uid, req.user.email, req.user.name);
      return res.status(200).json(user);
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// DELETE /api/auth/account
app.delete('/api/auth/account', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE firebase_uid = $1', [req.user.uid]);
    await admin.auth().deleteUser(req.user.uid);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth' });
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

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
  });
});
