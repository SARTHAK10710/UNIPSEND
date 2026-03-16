CREATE TABLE transactions (
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
