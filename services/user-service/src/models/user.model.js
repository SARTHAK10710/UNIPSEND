const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '../../../../.env') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || undefined,
  host: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_HOST || 'localhost'),
  port: process.env.POSTGRES_URL ? undefined : (parseInt(process.env.POSTGRES_PORT, 10) || 5432),
  database: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_DB || 'unispend'),
  user: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_USER || 'admin'),
  password: process.env.POSTGRES_URL ? undefined : (process.env.POSTGRES_PASSWORD || 'password'),
});

const initTable = async () => {
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
    )
  `);
  console.log('✓ Users table ready (from model)');
};
initTable().catch(console.error);

const findByFirebaseUid = async (firebase_uid) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE firebase_uid = $1',
    [firebase_uid]
  );
  return result.rows[0] || null;
};

const createUser = async (firebase_uid, email, firstName) => {
  const result = await pool.query(
    `INSERT INTO users (firebase_uid, email, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE
     SET email = EXCLUDED.email,
         updated_at = NOW()
     RETURNING *`,
    [firebase_uid, email, firstName || '']
  );
  return result.rows[0];
};

const updateProfile = async (firebase_uid, firstName, lastName) => {
  const result = await pool.query(
    `UPDATE users SET
       first_name = $1,
       last_name = $2,
       updated_at = NOW()
     WHERE firebase_uid = $3
     RETURNING *`,
    [firstName, lastName, firebase_uid]
  );
  return result.rows[0];
};

const updateFCMToken = async (firebase_uid, token) => {
  const result = await pool.query(
    `UPDATE users SET
       fcm_token = $1,
       updated_at = NOW()
     WHERE firebase_uid = $2
     RETURNING *`,
    [token, firebase_uid]
  );
  return result.rows[0];
};

const updateRiskScore = async (firebase_uid, riskScore, segment) => {
  const result = await pool.query(
    `UPDATE users SET
       risk_score = $1,
       segment = $2,
       updated_at = NOW()
     WHERE firebase_uid = $3
     RETURNING *`,
    [riskScore, segment, firebase_uid]
  );
  return result.rows[0];
};

const getRiskScore = async (firebase_uid) => {
  const result = await pool.query(
    'SELECT risk_score, segment FROM users WHERE firebase_uid = $1',
    [firebase_uid]
  );
  return result.rows[0] || null;
};

const deleteUser = async (firebase_uid) => {
  await pool.query(
    'DELETE FROM users WHERE firebase_uid = $1',
    [firebase_uid]
  );
  return { deleted: true };
};

module.exports = {
  findByFirebaseUid,
  createUser,
  updateProfile,
  updateFCMToken,
  updateRiskScore,
  getRiskScore,
  deleteUser,
};
