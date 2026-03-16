const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

// Try to init Voucherify, but don't crash if keys are missing
let voucherify = null;
try {
  if (process.env.VOUCHERIFY_APP_ID && process.env.VOUCHERIFY_SECRET_KEY) {
    const { VoucherifyServerSide } = require('@voucherify/sdk');
    voucherify = VoucherifyServerSide({
      applicationId: process.env.VOUCHERIFY_APP_ID,
      secretKey: process.env.VOUCHERIFY_SECRET_KEY,
    });
    console.log('✓ Voucherify initialized');
  } else {
    console.log('⚠ Voucherify keys not set — using mock rewards');
  }
} catch (err) {
  console.error('⚠ Voucherify init failed:', err.message, '— using mock rewards');
}

const SCRIBEUP_API_TOKEN = process.env.SCRIBEUP_API_TOKEN;
const SCRIBEUP_CLIENT_ID = process.env.SCRIBEUP_CLIENT_ID;
const SCRIBEUP_WEBHOOK_SECRET = process.env.SCRIBEUP_WEBHOOK_SECRET || 'secret';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';

const MOCK_REWARDS = [
  {
    id: 'offer1',
    merchantName: 'Zomato',
    merchantEmoji: '🍕',
    cashbackPercent: 10,
    category: 'Food & Dining',
    minSpend: 500,
    expiryDate: 'Mar 31',
    isActive: true,
  },
  {
    id: 'offer2',
    merchantName: 'Uber',
    merchantEmoji: '🚗',
    cashbackPercent: 15,
    category: 'Transport',
    minSpend: 200,
    expiryDate: 'Apr 15',
    isActive: true,
  },
  {
    id: 'offer3',
    merchantName: 'Spotify',
    merchantEmoji: '🎵',
    cashbackPercent: 20,
    category: 'Entertainment',
    minSpend: 119,
    expiryDate: 'Apr 30',
    isActive: true,
  },
];

const app = express();
const PORT = process.env.SUBSCRIPTION_PORT || 3004;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Raw body needed for webhook signature verification
app.use('/webhooks/scribeup', express.raw({ type: 'application/json' }));
app.use(express.json());

// POST /scribeup/init
app.post('/scribeup/init', async (req, res) => {
  try {
    const { user_id, email, first_name, last_name } = req.body;

    if (!SCRIBEUP_API_TOKEN) {
      return res.status(200).json({
        url: 'https://staging.widget.scribeup.io/preview#mock',
        list_preview_url: 'https://staging.widget.scribeup.io/list-preview#mock',
        calendar_preview_url: 'https://staging.widget.scribeup.io/calendar-preview#mock',
      });
    }

    const response = await axios.post(
      'https://api.scribeup.io/api/v1/auth/users/init',
      { user_id, email, first_name, last_name },
      {
        headers: {
          Authorization: `Bearer ${SCRIBEUP_API_TOKEN}`,
          'X-Client-ID': SCRIBEUP_CLIENT_ID,
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
    // Fallback to mock on error
    res.status(200).json({
      url: 'https://staging.widget.scribeup.io/preview#mock',
      list_preview_url: 'https://staging.widget.scribeup.io/list-preview#mock',
      calendar_preview_url: 'https://staging.widget.scribeup.io/calendar-preview#mock',
    });
  }
});

// GET /rewards
app.get('/rewards', async (req, res) => {
  try {
    if (voucherify) {
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
      return res.status(200).json({ rewards: activeCampaigns });
    }

    // Return mock rewards
    res.status(200).json({ rewards: MOCK_REWARDS });
  } catch (error) {
    console.error('Get rewards error:', error.message);
    res.status(200).json({ rewards: MOCK_REWARDS });
  }
});

// POST /rewards/redeem
app.post('/rewards/redeem', async (req, res) => {
  try {
    const { voucher_code, user_id, amount } = req.body;

    if (voucherify) {
      const result = await voucherify.redemptions.redeem(voucher_code, {
        customer: { source_id: user_id },
        order: { amount: Math.round(amount * 100) },
      });
      return res.status(200).json({
        id: result.id,
        status: result.result,
        voucher_code: result.voucher?.code,
        amount: result.order?.total_discount_amount,
      });
    }

    // Mock redemption
    res.status(200).json({ success: true, mock: true });
  } catch (error) {
    console.error('Redeem reward error:', error.message);
    res.status(200).json({ success: true, mock: true });
  }
});

// GET /rewards/history
app.get('/rewards/history', async (req, res) => {
  try {
    if (voucherify) {
      const list = await voucherify.redemptions.list();
      return res.status(200).json({ history: list.redemptions || [] });
    }
    res.status(200).json({ history: [] });
  } catch (error) {
    console.error('Get rewards history error:', error.message);
    res.status(200).json({ history: [] });
  }
});

// POST /webhooks/scribeup (kept with full path since it's a webhook callback)
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

    if (signature !== 'sha256=' + expectedSignature) {
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'bill_reminder') {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/renewal`, {
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

// GET /v1/users/:user_id/processor_tokens (kept full path)
app.get('/v1/users/:user_id/processor_tokens', async (req, res) => {
  res.status(200).json({
    data: { plaid_processor_tokens: [] },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'subscription' });
});

// 404 handler
app.use((req, res) => {
  res.status(200).json({ data: [], error: placeholder, message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Subscription Service running on port ${PORT}`);
});
