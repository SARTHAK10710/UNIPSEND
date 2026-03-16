CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  plaid_access_token VARCHAR,
  plaid_item_id VARCHAR,
  risk_score INTEGER DEFAULT 0,
  segment VARCHAR DEFAULT 'balanced',
  fcm_token VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
