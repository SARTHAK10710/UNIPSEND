const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes',
  },
  skip: (req) => {
    return req.path === '/health';
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many auth attempts',
    message: 'Please try again after 15 minutes',
  },
});

const plaidLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many bank requests',
    message: 'Please slow down',
  },
});

const marketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many market data requests',
    message: 'Please wait a moment',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  plaidLimiter,
  marketLimiter,
};
