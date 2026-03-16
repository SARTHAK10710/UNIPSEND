CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR NOT NULL,
  merchant_name VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  renewal_date DATE,
  status VARCHAR DEFAULT 'active',
  detected_at TIMESTAMP DEFAULT NOW()
);
