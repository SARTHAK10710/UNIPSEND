const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3005;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// POST /api/notify/single
app.post('/api/notify/single', async (req, res) => {
  try {
    const { fcm_token, title, body, screen } = req.body;

    const result = await admin.messaging().send({
      token: fcm_token,
      notification: { title, body },
      data: { screen: screen || '' },
    });

    res.status(200).json({ success: true, messageId: result });
  } catch (error) {
    console.error('Send notification error:', error.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/notify/budget-alert
app.post('/api/notify/budget-alert', async (req, res) => {
  try {
    const { fcm_token, percentage } = req.body;

    const result = await admin.messaging().send({
      token: fcm_token,
      notification: {
        title: 'Budget Alert 💰',
        body: `You've used ${percentage}% of your budget`,
      },
      data: { screen: 'SpendingManager' },
    });

    res.status(200).json({ success: true, messageId: result });
  } catch (error) {
    console.error('Budget alert error:', error.message);
    res.status(500).json({ error: 'Failed to send budget alert' });
  }
});

// POST /api/notify/renewal
app.post('/api/notify/renewal', async (req, res) => {
  try {
    const { fcm_token, merchant, days } = req.body;

    const result = await admin.messaging().send({
      token: fcm_token,
      notification: {
        title: 'Subscription Renewal 🔔',
        body: `${merchant} renews in ${days} days`,
      },
      data: { screen: 'SubscriptionManager' },
    });

    res.status(200).json({ success: true, messageId: result });
  } catch (error) {
    console.error('Renewal notification error:', error.message);
    res.status(500).json({ error: 'Failed to send renewal notification' });
  }
});

// POST /api/notify/investment
app.post('/api/notify/investment', async (req, res) => {
  try {
    const { fcm_token, symbol, pnl } = req.body;

    const result = await admin.messaging().send({
      token: fcm_token,
      notification: {
        title: 'Investment Update 📈',
        body: `${symbol} is up ${pnl}% today`,
      },
      data: { screen: 'InvestmentPortfolio' },
    });

    res.status(200).json({ success: true, messageId: result });
  } catch (error) {
    console.error('Investment notification error:', error.message);
    res.status(500).json({ error: 'Failed to send investment notification' });
  }
});

// POST /api/notify/bulk
app.post('/api/notify/bulk', async (req, res) => {
  try {
    const { tokens, title, body } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'No tokens provided' });
    }

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });

    res.status(200).json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error('Bulk notification error:', error.message);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'notification-service' });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
