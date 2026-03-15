const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const admin = require('firebase-admin');

// Endpoint to verify user's token and return their Firebase profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    // req.user is populated by the verifyToken middleware
    const uid = req.user.uid;
    
    // You can optionally fetch the full user record from Firebase
    const userRecord = await admin.auth().getUser(uid);
    
    res.status(200).json({
      message: 'Token holds valid Firebase ID',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// A webhook/endpoint to create a custom token (optional, often used if bridging auth)
router.post('/custom-token', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const customToken = await admin.auth().createCustomToken(uid);
    res.status(200).json({ customToken });
  } catch (error) {
    res.status(500).json({ error: 'Error creating custom token' });
  }
});

module.exports = router;
