CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR NOT NULL,
  symbol VARCHAR NOT NULL,
  quantity DECIMAL NOT NULL,
  avg_price DECIMAL NOT NULL,
  platform VARCHAR DEFAULT 'alpaca',
  created_at TIMESTAMP DEFAULT NOW()
);
