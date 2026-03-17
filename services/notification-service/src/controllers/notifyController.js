const fcmService = require('../services/fcmService');

exports.sendSingle = async (req, res) => {
  try {
    const { fcm_token, title, body, screen } = req.body;

    if (!fcm_token || !title || !body) {
      return res.status(400).json({
        error: 'fcm_token, title, body are required',
      });
    }

    const result = await fcmService.sendToDevice(
      fcm_token, title, body, { screen: screen || 'HomeScreen' }
    );
    res.json(result);
  } catch (err) {
    console.error('[Notify] sendSingle error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.sendBudgetAlert = async (req, res) => {
  try {
    const { fcm_token, percentage } = req.body;
    const result = await fcmService.sendBudgetAlert(fcm_token, percentage);
    res.json(result);
  } catch (err) {
    console.error('[Notify] budgetAlert error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.sendRenewal = async (req, res) => {
  try {
    const { fcm_token, merchant, days } = req.body;
    const result = await fcmService.sendRenewalAlert(fcm_token, merchant, days);
    res.json(result);
  } catch (err) {
    console.error('[Notify] renewal error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.sendInvestmentUpdate = async (req, res) => {
  try {
    const { fcm_token, symbol, pnl } = req.body;
    const result = await fcmService.sendInvestmentAlert(fcm_token, symbol, pnl);
    res.json(result);
  } catch (err) {
    console.error('[Notify] investment error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.sendBulk = async (req, res) => {
  try {
    const { tokens, title, body, screen } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        error: 'tokens array is required',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        error: 'title and body are required',
      });
    }

    const result = await fcmService.sendToMultiple(
      tokens, title, body, { screen: screen || 'HomeScreen' }
    );

    res.json({
      ...result,
      total: tokens.length,
    });
  } catch (err) {
    console.error('[Notify] bulk error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.sendAIInsight = async (req, res) => {
  try {
    const { fcm_token, insight, saving } = req.body;
    const result = await fcmService.sendAIInsight(fcm_token, insight, saving);
    res.json(result);
  } catch (err) {
    console.error('[Notify] aiInsight error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
