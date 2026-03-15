const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyToken = require('../middleware/verifyToken');

// POST /api/auth/register — after Firebase signup, create user in DB
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { displayName, phone, currency, monthlyIncome } = req.body;

    const existing = await req.db.query('SELECT id FROM users WHERE firebase_uid = $1', [uid]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const result = await req.db.query(
      `INSERT INTO users (firebase_uid, email, display_name, phone, currency, monthly_income)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uid, email, displayName || null, phone || null, currency || 'INR', monthlyIncome || 0]
    );

    res.status(201).json({ message: 'User registered', user: result.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me — get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const result = await req.db.query('SELECT * FROM users WHERE firebase_uid = $1', [uid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/me — update user profile
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { displayName, phone, currency, monthlyIncome } = req.body;

    const result = await req.db.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           phone = COALESCE($2, phone),
           currency = COALESCE($3, currency),
           monthly_income = COALESCE($4, monthly_income),
           updated_at = NOW()
       WHERE firebase_uid = $5
       RETURNING *`,
      [displayName, phone, currency, monthlyIncome, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/verify — just verify a token is valid
router.post('/verify', verifyToken, (req, res) => {
  res.status(200).json({
    valid: true,
    uid: req.user.uid,
    email: req.user.email,
  });
});

// DELETE /api/auth/me — delete user account
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    await req.db.query('DELETE FROM users WHERE firebase_uid = $1', [uid]);
    await admin.auth().deleteUser(uid);

    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
