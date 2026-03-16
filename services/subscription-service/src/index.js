const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');
const { VoucherifyServerSide } = require('@voucherify/sdk');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

const voucherify = VoucherifyServerSide({
  applicationId: process.env.VOUCHERIFY_APP_ID,
  secretKey: process.env.VOUCHERIFY_SECRET_KEY,
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

const SCRIBEUP_BASE = process.env.SCRIBEUP_API_URL || 'https://api.scribeup.com';
const SCRIBEUP_API_KEY = process.env.SCRIBEUP_API_KEY;
const SCRIBEUP_WEBHOOK_SECRET = process.env.SCRIBEUP_WEBHOOK_SECRET;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

const app = express();
const PORT = process.env.SUBSCRIPTION_PORT || 3004;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Raw body needed for webhook signature verification
app.use('/webhooks/scribeup', express.raw({ type: 'application/json' }));
app.use(express.json());

// POST /subscriptions/scribeup/init
app.post('/subscriptions/scribeup/init', async (req, res) => {
  try {
    const { user_id, email, first_name, last_name } = req.body;

    const response = await axios.post(
      `${SCRIBEUP_BASE}/api/v1/auth/users/init`,
      { user_id, email, first_name, last_name },
      {
        headers: {
          Authorization: `Bearer ${SCRIBEUP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      url: response.data.url,
      list_preview_url: response.data.list_preview_url,
      calendar_preview_url: response.data.calendar_preview_url,
    });
  } catch (error) {
    console.error('ScribeUp init error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initialize ScribeUp' });
  }
});

// GET /subscriptions/rewards
app.get('/subscriptions/rewards', async (req, res) => {
  try {
    const campaigns = await voucherify.campaigns.list();

    const activeCampaigns = (campaigns.campaigns || [])
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.campaign_type,
        start_date: c.start_date,
        expiration_date: c.expiration_date,
        metadata: c.metadata,
      }));

    res.status(200).json({ rewards: activeCampaigns });
  } catch (error) {
    console.error('Get rewards error:', error.message);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// POST /subscriptions/rewards/redeem
app.post('/subscriptions/rewards/redeem', async (req, res) => {
  try {
    const { voucher_code, user_id, amount } = req.body;

    const result = await voucherify.redemptions.redeem(voucher_code, {
      customer: { source_id: user_id },
      order: {
        amount: Math.round(amount * 100),
      },
    });

    res.status(200).json({
      id: result.id,
      status: result.result,
      voucher_code: result.voucher?.code,
      amount: result.order?.total_discount_amount,
    });
  } catch (error) {
    console.error('Redeem reward error:', error.message);
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

// POST /webhooks/scribeup
app.post('/webhooks/scribeup', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.body.toString('utf8');

    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Missing webhook headers' });
    }

    const message = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', SCRIBEUP_WEBHOOK_SECRET)
      .update(message)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'bill_reminder') {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/notify/renewal`, {
        fcm_token: event.data.fcm_token,
        merchant: event.data.merchant_name,
        days: event.data.days_until_renewal,
      });
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /v1/users/:user_id/processor_tokens
app.get('/v1/users/:user_id/processor_tokens', async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT plaid_access_token, plaid_item_id
       FROM users WHERE firebase_uid = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user_id,
      processor_tokens: result.rows.map((row) => ({
        access_token: row.plaid_access_token,
        item_id: row.plaid_item_id,
      })),
    });
  } catch (error) {
    console.error('Get processor tokens error:', error.message);
    res.status(500).json({ error: 'Failed to fetch processor tokens' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'subscription-service' });
});

app.listen(PORT, () => {
  console.log(`Subscription Service running on port ${PORT}`);
});
