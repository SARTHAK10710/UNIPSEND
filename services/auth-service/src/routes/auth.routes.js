const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const verifyToken = require("../middleware/verifyToken");

// POST /auth/register — create user in postgres after Firebase signup
router.post("/register", verifyToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { firstName, lastName } = req.body;

    const existing = await req.db.query(
      "SELECT * FROM users WHERE firebase_uid = $1",
      [uid],
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "User already registered",
        user: existing.rows[0],
      });
    }

    const result = await req.db.query(
      `INSERT INTO users (firebase_uid, email, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uid, email, firstName || null, lastName || null],
    );

    res.status(201).json({ message: "User registered", user: result.rows[0] });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /auth/me — get current user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const result = await req.db.query(
      "SELECT * FROM users WHERE firebase_uid = $1",
      [uid],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /auth/me — update user profile
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { firstName, lastName, fcmToken, segment } = req.body;

    const result = await req.db.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           fcm_token = COALESCE($3, fcm_token),
           segment = COALESCE($4, segment),
           updated_at = NOW()
       WHERE firebase_uid = $5
       RETURNING *`,
      [firstName, lastName, fcmToken, segment, uid],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated", user: result.rows[0] });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /auth/verify — check if token is valid
router.post("/verify", verifyToken, (req, res) => {
  res.status(200).json({
    valid: true,
    uid: req.user.uid,
    email: req.user.email,
  });
});

// DELETE /auth/account — delete user from Firebase + postgres
router.delete("/account", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    await req.db.query("DELETE FROM users WHERE firebase_uid = $1", [uid]);
    await admin.auth().deleteUser(uid);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
