const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { Pool } = require("pg");
const authRoutes = require("./routes/auth.routes");

dotenv.config({ path: require("path").resolve(__dirname, "../../../.env") });

// Firebase Admin init using env vars
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: firebasePrivateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// Postgres connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  database: process.env.POSTGRES_DB || "unispend",
  user: process.env.POSTGRES_USER || "admin",
  password: process.env.POSTGRES_PASSWORD || "password",
});

// Verify DB connection on startup
pool
  .query("SELECT 1")
  .then(() => console.log("✓ Postgres connected"))
  .catch((err) => console.error("✗ DB connection error:", err.message));

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Security & logging middleware
app.use(helmet());
app.use(cors());
app.use(morgan("short"));
app.use(express.json());

// Attach DB pool to every request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use("/auth", authRoutes);

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "OK",
      service: "auth-service",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: "ERROR", message: "Database unreachable" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});
