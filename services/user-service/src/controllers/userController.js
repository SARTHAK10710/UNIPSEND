const userModel = require('../models/user.model');

exports.getProfile = async (req, res) => {
  try {
    let user = await userModel.findByFirebaseUid(req.user.uid);

    if (!user) {
      user = await userModel.createUser(
        req.user.uid,
        req.user.email,
        req.user.name || ''
      );
    }

    const safeUser = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      risk_score: user.risk_score,
      segment: user.segment,
      has_connected_bank: !!user.plaid_access_token,
      created_at: user.created_at,
    };

    res.json(safeUser);
  } catch (err) {
    console.error('[User] getProfile error:', err.message);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name } = req.body;

    if (!first_name && !last_name) {
      return res.status(400).json({
        error: 'first_name or last_name required',
      });
    }

    const updated = await userModel.updateProfile(
      req.user.uid,
      first_name || '',
      last_name || ''
    );

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('[User] updateProfile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.saveFCMToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'FCM token required',
      });
    }

    await userModel.updateFCMToken(req.user.uid, token);
    res.json({ success: true });
  } catch (err) {
    console.error('[User] saveFCMToken error:', err.message);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
};

exports.getRiskScore = async (req, res) => {
  try {
    const data = await userModel.getRiskScore(req.user.uid);

    if (!data) {
      return res.json({
        risk_score: 50,
        segment: 'balanced',
        label: 'Moderate',
        description: 'You balance risk and reward',
      });
    }

    let label, description;
    if (data.risk_score <= 33) {
      label = 'Conservative';
      description = 'You prefer safe investments';
    } else if (data.risk_score <= 66) {
      label = 'Moderate';
      description = 'You balance risk and reward';
    } else {
      label = 'Aggressive';
      description = 'You chase high returns';
    }

    res.json({
      risk_score: data.risk_score,
      segment: data.segment,
      label,
      description,
    });
  } catch (err) {
    console.error('[User] getRiskScore error:', err.message);
    res.json({
      risk_score: 50,
      segment: 'balanced',
      label: 'Moderate',
      description: 'You balance risk and reward',
    });
  }
};

exports.updateRiskScore = async (req, res) => {
  try {
    const { risk_score, segment } = req.body;

    if (risk_score === undefined) {
      return res.status(400).json({
        error: 'risk_score required',
      });
    }

    if (risk_score < 0 || risk_score > 100) {
      return res.status(400).json({
        error: 'risk_score must be between 0 and 100',
      });
    }

    await userModel.updateRiskScore(
      req.user.uid,
      risk_score,
      segment || 'balanced'
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[User] updateRiskScore error:', err.message);
    res.status(500).json({ error: 'Failed to update risk score' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await userModel.deleteUser(req.user.uid);

    const admin = require('firebase-admin');
    await admin.auth().deleteUser(req.user.uid);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (err) {
    console.error('[User] deleteAccount error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
