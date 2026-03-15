CREATE TABLE IF NOT EXISTS plaid_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  item_id VARCHAR(255) UNIQUE NOT NULL,
  institution_id VARCHAR(100),
  institution_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  plaid_transaction_id VARCHAR(255) UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  category VARCHAR(100),
  subcategory VARCHAR(100),
  merchant_name VARCHAR(255),
  description TEXT,
  transaction_date DATE NOT NULL,
  pending BOOLEAN DEFAULT false,
  source VARCHAR(20) DEFAULT 'plaid',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_plaid_items_user_id ON plaid_items(user_id);
