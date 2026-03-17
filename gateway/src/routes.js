const { createProxyMiddleware } = require('http-proxy-middleware');
const {
  authLimiter,
  plaidLimiter,
  marketLimiter,
} = require('./middleware/rateLimiter');

const setupRoutes = (app) => {
  const proxy = (target, pathRewrite = {}) =>
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite,
      on: {
        error: (err, req, res) => {
          console.error(
            `[Gateway] proxy error → ${target}:`,
            err.message
          );
          res.status(503).json({
            error: 'Service unavailable',
            service: target,
            message: err.message,
          });
        },
        proxyReq: (proxyReq, req) => {
          console.log(
            `[Gateway] ${req.method} ${req.path} → ${target}`
          );
        },
      },
    });

  // AUTH SERVICE - port 3001
  app.use(
    '/api/auth',
    authLimiter,
    proxy('http://auth-service:3001')
  );

  // PLAID SERVICE - port 3002
  app.use(
    '/api/plaid',
    plaidLimiter,
    proxy('http://plaid-service:3002')
  );

  // INVESTMENT SERVICE - port 3003
  app.use(
    '/api/investments',
    marketLimiter,
    proxy('http://investment-service:3003')
  );

  // SUBSCRIPTION SERVICE - port 3004
  app.use(
    '/api/subscriptions',
    proxy('http://subscription-service:3004')
  );

  // NOTIFICATION SERVICE - port 3005
  app.use(
    '/api/notify',
    proxy('http://notification-service:3005')
  );

  // USER SERVICE - port 3006
  app.use(
    '/api/user',
    proxy('http://user-service:3006')
  );

  // AI SERVICE - hosted on Render
  app.use(
    '/api/ai',
    proxy('https://unispend-ai.onrender.com', {
      '^/api/ai': '',
    })
  );

  // 404 for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
      availableRoutes: [
        '/api/auth',
        '/api/plaid',
        '/api/investments',
        '/api/subscriptions',
        '/api/notify',
        '/api/user',
        '/api/ai',
        '/health',
      ],
    });
  });
};

module.exports = setupRoutes;
