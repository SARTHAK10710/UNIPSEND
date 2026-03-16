const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');
const Redis = require('ioredis');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const admin = require('firebase-admin');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

// Firebase Admin init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const verifyToken = require('./middleware/verifyToken');

// Alpaca — ALWAYS paper trading
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY_ID,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});

// Redis
const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});
redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

// Alpha Vantage config
const AV_KEY = process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_VANTAGE_API_KEY;
const AV_BASE = 'https://www.alphavantage.co/query';

const app = express();
const PORT = process.env.INVESTMENT_PORT || 3003;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ─── HELPERS ────────────────────────────────────────────

const getCachedOrFetch = async (key, ttl, fetchFn) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const fresh = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
};

const checkAVRateLimit = async () => {
  const key = 'av_calls_today';
  const count = await redis.get(key);
  if (count && parseInt(count) > 24) {
    throw new Error('Market data limit reached, try again tomorrow');
  }
};

const incrementAVCounter = async () => {
  const key = 'av_calls_today';
  const count = await redis.incr(key);
  if (count === 1) {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
    await redis.expire(key, secondsUntilMidnight);
  }
};

const fetchFromAV = async (params) => {
  await checkAVRateLimit();
  await incrementAVCounter();

  const response = await axios.get(AV_BASE, {
    params: { ...params, apikey: AV_KEY },
  });

  if (response.data['Error Message']) {
    throw new Error(response.data['Error Message']);
  }
  if (response.data['Note']) {
    throw new Error(response.data['Note']);
  }

  return response.data;
};

// ─── ALPHA VANTAGE ROUTES ───────────────────────────────

// GET /investments/market/price/:symbol
app.get('/investments/market/price/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `price:${symbol}`;

    const data = await getCachedOrFetch(cacheKey, 300, async () => {
      const raw = await fetchFromAV({ function: 'GLOBAL_QUOTE', symbol });
      const quote = raw['Global Quote'];

      if (!quote || !quote['05. price']) {
        throw new Error('Quote not found for symbol');
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'],
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
      };
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Get market price error:', error.message);
    if (error.message.includes('limit reached')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch market price' });
  }
});

// GET /investments/market/history/:symbol
app.get('/investments/market/history/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `history:${symbol}`;

    const data = await getCachedOrFetch(cacheKey, 3600, async () => {
      const raw = await fetchFromAV({
        function: 'TIME_SERIES_DAILY',
        symbol,
        outputsize: 'compact',
      });

      const timeSeries = raw['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('History not found for symbol');
      }

      return Object.entries(timeSeries).map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
      }));
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Get market history error:', error.message);
    if (error.message.includes('limit reached')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch market history' });
  }
});

// GET /investments/market/search/:query
app.get('/investments/market/search/:query', verifyToken, async (req, res) => {
  try {
    const { query } = req.params;
    const cacheKey = `search:${query}`;

    const data = await getCachedOrFetch(cacheKey, 86400, async () => {
      const raw = await fetchFromAV({
        function: 'SYMBOL_SEARCH',
        keywords: query,
      });

      const matches = raw['bestMatches'] || [];

      return matches.map((m) => ({
        symbol: m['1. symbol'],
        name: m['2. name'],
        type: m['3. type'],
        region: m['4. region'],
      }));
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Search symbols error:', error.message);
    if (error.message.includes('limit reached')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

// GET /investments/market/movers
app.get('/investments/market/movers', verifyToken, async (req, res) => {
  try {
    const symbols = ['SPY', 'AAPL', 'RELIANCE.BSE', 'TCS.BSE', 'NIFTYBEES.BSE', 'BTC'];
    const cacheKey = 'market:movers';

    const data = await getCachedOrFetch(cacheKey, 300, async () => {
      const results = [];

      for (const symbol of symbols) {
        try {
          const priceKey = `price:${symbol}`;
          const priceData = await getCachedOrFetch(priceKey, 300, async () => {
            const raw = await fetchFromAV({ function: 'GLOBAL_QUOTE', symbol });
            const quote = raw['Global Quote'];
            if (!quote || !quote['05. price']) return null;

            return {
              symbol: quote['01. symbol'],
              price: parseFloat(quote['05. price']),
              change: parseFloat(quote['09. change']),
              changePercent: quote['10. change percent'],
              high: parseFloat(quote['03. high']),
              low: parseFloat(quote['04. low']),
              volume: parseInt(quote['06. volume']),
            };
          });

          if (priceData) results.push(priceData);
        } catch (err) {
          console.error(`Failed to fetch mover ${symbol}:`, err.message);
        }
      }

      results.sort((a, b) => {
        const aVal = parseFloat(a.changePercent) || 0;
        const bVal = parseFloat(b.changePercent) || 0;
        return bVal - aVal;
      });

      return {
        gainers: results.filter((r) => parseFloat(r.changePercent) > 0),
        losers: results.filter((r) => parseFloat(r.changePercent) <= 0),
      };
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Get market movers error:', error.message);
    if (error.message.includes('limit reached')) {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch market movers' });
  }
});

// ─── ALPACA ROUTES ──────────────────────────────────────

// GET /investments/portfolio
app.get('/investments/portfolio', verifyToken, async (req, res) => {
  try {
    const positions = await alpaca.getPositions();

    const holdings = positions.map((pos) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      avgEntryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      marketValue: parseFloat(pos.market_value),
      unrealizedPnl: parseFloat(pos.unrealized_pl),
      unrealizedPnlPercent: parseFloat(pos.unrealized_plpc),
      side: pos.side,
    }));

    res.status(200).json({ holdings });
  } catch (error) {
    console.error('Get portfolio error:', error.message);
    res.status(200).json({
      holdings: [],
      portfolioValue: 0,
      buyingPower: 0,
      message: 'Connect Alpaca account to view portfolio',
    });
  }
});

// GET /investments/account
app.get('/investments/account', verifyToken, async (req, res) => {
  try {
    const account = await alpaca.getAccount();

    res.status(200).json({
      portfolioValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power),
      cash: parseFloat(account.cash),
      dayPnl: parseFloat(account.equity) - parseFloat(account.last_equity),
      totalPnl: parseFloat(account.equity) - parseFloat(account.cash),
    });
  } catch (error) {
    console.error('Get Alpaca account error:', error.message);
    res.status(200).json({
      portfolioValue: 0,
      buyingPower: 0,
      cash: 0,
      dayPnl: 0,
      totalPnl: 0,
      message: 'Connect Alpaca account to view portfolio',
    });
  }
});

// POST /investments/order
app.post('/investments/order', verifyToken, async (req, res) => {
  try {
    const { symbol, qty, side } = req.body;

    if (!symbol || !qty || !side) {
      return res.status(400).json({ error: 'symbol, qty, and side are required' });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'side must be "buy" or "sell"' });
    }

    if (qty <= 0) {
      return res.status(400).json({ error: 'qty must be greater than 0' });
    }

    const order = await alpaca.createOrder({
      symbol,
      qty,
      side,
      type: 'market',
      time_in_force: 'day',
    });

    res.status(200).json({
      orderId: order.id,
      symbol: order.symbol,
      qty: parseFloat(order.qty),
      side: order.side,
      status: order.status,
      filledAt: order.filled_at,
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /investments/orders
app.get('/investments/orders', verifyToken, async (req, res) => {
  try {
    const orders = await alpaca.getOrders({ status: 'all', limit: 20 });

    const formatted = orders.map((o) => ({
      orderId: o.id,
      symbol: o.symbol,
      qty: parseFloat(o.qty),
      side: o.side,
      type: o.type,
      status: o.status,
      filledAt: o.filled_at,
      submittedAt: o.submitted_at,
      filledAvgPrice: o.filled_avg_price ? parseFloat(o.filled_avg_price) : null,
    }));

    res.status(200).json({ orders: formatted });
  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(200).json({ orders: [], message: 'Connect Alpaca account to view orders' });
  }
});

// ─── HEALTH CHECK ───────────────────────────────────────

app.get('/health', async (req, res) => {
  let redisStatus = 'disconnected';
  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch (e) {
    redisStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'ok',
    alphaVantage: 'connected',
    alpaca: 'paper trading',
    redis: redisStatus,
  });
});

// ─── 404 HANDLER ────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR MIDDLEWARE ───────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ──────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Investment Service running on port ${PORT}`);
});
