const admin = require('firebase-admin');

const sendToDevice = async (token, title, body, data = {}) => {
  if (!token) {
    return { success: false, reason: 'no_token' };
  }

  try {
    const message = {
      token,
      notification: { title, body },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'unispend_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const result = await admin.messaging().send(message);
    return { success: true, messageId: result };
  } catch (err) {
    console.error('[FCM] error:', err.message);
    return { success: false, error: err.message };
  }
};

const sendToMultiple = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) {
    return { success: false, reason: 'no_tokens' };
  }

  try {
    const message = {
      tokens,
      notification: { title, body },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[FCM] bulk error:', err.message);
    return { success: false, error: err.message };
  }
};

const sendBudgetAlert = (token, percentage) =>
  sendToDevice(
    token,
    '💸 Budget Alert',
    `You have used ${percentage}% of monthly budget`,
    { screen: 'SpendingScreen' }
  );

const sendRenewalAlert = (token, merchant, days) =>
  sendToDevice(
    token,
    '📅 Subscription Renewing',
    `${merchant} renews in ${days} day${days > 1 ? 's' : ''}`,
    { screen: 'SubscriptionsScreen' }
  );

const sendInvestmentAlert = (token, symbol, pnl) => {
  const direction = pnl >= 0 ? '📈' : '📉';
  const sign = pnl >= 0 ? '+' : '';
  return sendToDevice(
    token,
    `${direction} Portfolio Update`,
    `${symbol} is ${sign}${pnl}% today`,
    { screen: 'InvestmentScreen' }
  );
};

const sendAIInsight = (token, insight, saving) =>
  sendToDevice(
    token,
    '🤖 AI Insight',
    saving
      ? `${insight} — Save ${saving}/mo`
      : insight,
    { screen: 'SpendingScreen' }
  );

module.exports = {
  sendToDevice,
  sendToMultiple,
  sendBudgetAlert,
  sendRenewalAlert,
  sendInvestmentAlert,
  sendAIInsight,
};
