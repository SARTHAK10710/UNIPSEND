CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR NOT NULL,
  merchant_name VARCHAR,
  cashback_amount DECIMAL NOT NULL,
  campaign_id VARCHAR,
  redeemed_at TIMESTAMP DEFAULT NOW()
);
