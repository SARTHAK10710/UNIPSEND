const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors());

// Logging
app.use(morgan("combined"));

// Rate limiting: Disabled for development to prevent 429 errors
/*
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
*/

// Proxy routes
const services = [
  { path: "/api/auth", target: "http://auth-service:3001" },
  { path: "/api/plaid", target: "http://plaid-service:3002" },
  { path: "/api/investments", target: "http://investment-service:3003" },
  { path: "/api/subscriptions", target: "http://subscription-service:3004" },
  { path: "/api/notify", target: "http://notification-service:3005" },
  { path: "/api/user", target: "http://user-service:3006" },
  { path: "/api/ai", target: "https://unispend-ai.onrender.com" },
];

for (const { path, target } of services) {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
    }),
  );
}

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    services: services.map((s) => s.path),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});
