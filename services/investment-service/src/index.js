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

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY_ID,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});

const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});
redis.on('connect', () => console.log('✓ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

const AV_KEY = process.env.ALPHA_VANTAGE_KEY;
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

const fetchAVQuote = async (symbol) => {
  const res = await axios.get(AV_BASE, {
    params: { function: 'GLOBAL_QUOTE', symbol, apikey: AV_KEY },
  });
  const quote = res.data['Global Quote'];
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
};

// ─── ALPACA ROUTES ──────────────────────────────────────

// GET /api/investments/alpaca/account
app.get('/api/investments/alpaca/account', verifyToken, async (req, res) => {
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
    console.error('Get account error:', error.message);
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

// GET /api/investments/alpaca/portfolio
app.get('/api/investments/alpaca/portfolio', verifyToken, async (req, res) => {
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
    res.status(200).json({ holdings: [] });
  }
});

// GET /api/investments/alpaca/orders
app.get('/api/investments/alpaca/orders', verifyToken, async (req, res) => {
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
    res.status(200).json({ orders: [] });
  }
});

// POST /api/investments/alpaca/order
app.post('/api/investments/alpaca/order', verifyToken, async (req, res) => {
  try {
    const symbol = req.body.symbol?.trim().toUpperCase();
    const { qty, side } = req.body;

    if (!symbol || !qty || !side) {
      return res.status(400).json({ error: 'symbol, qty, and side are required' });
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'side must be "buy" or "sell"' });
    }
    if (qty <= 0) {
      return res.status(400).json({ error: 'qty must be greater than 0' });
    }

    // Indian stocks end with .BSE or .NSE — Alpaca does not support these
    const indianSuffixes = ['.BSE', '.NSE', '.BO', '.NS'];
    const knownIndianStocks = [
      'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICI', 'WIPRO', 'HCLTECH',
      'BAJFINANCE', 'KOTAKBANK', 'SBIN', 'AXISBANK', 'MARUTI', 'TITAN',
      'SUNPHARMA', 'TATAMOTORS', 'ADANIENT', 'ONGC', 'NTPC', 'POWERGRID',
      'ULTRACEMCO', 'NIFTYBEES', 'JUNIORBEES',
    ];
    const isIndianStock =
      indianSuffixes.some((s) => symbol.toUpperCase().endsWith(s)) ||
      knownIndianStocks.includes(symbol.toUpperCase());

    if (isIndianStock) {
      console.log('[Alpaca] simulating Indian stock order:', symbol);
      return res.status(200).json({
        success: true,
        simulated: true,
        order: {
          orderId: 'sim_' + Date.now(),
          symbol,
          qty: parseInt(qty),
          side,
          status: 'filled',
          createdAt: new Date().toISOString(),
          message: 'Simulated order for Indian market',
        },
      });
    }

    // Place real order on Alpaca for US stocks
    const order = await alpaca.createOrder({
      symbol,
      qty,
      side,
      type: 'market',
      time_in_force: 'gtc',
    });

    res.status(200).json({
      success: true,
      simulated: false,
      order: {
        orderId: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        status: order.status,
        filledAt: order.filled_at,
      },
    });
  } catch (error) {
    console.error('Create order error:', error.message);

    if (error.message?.includes('not found') || error.message?.includes('asset')) {
      return res.status(400).json({
        error: `${req.body.symbol} is not available for trading on this platform`,
        code: 'SYMBOL_NOT_FOUND',
      });
    }

    if (error.message?.includes('insufficient')) {
      return res.status(400).json({
        error: 'Insufficient buying power',
        code: 'INSUFFICIENT_FUNDS',
      });
    }

    res.status(500).json({ error: 'Order failed: ' + error.message });
  }
});


// ─── ALPHA VANTAGE / MARKET ROUTES ──────────────────────

// GET /api/investments/market/price/:symbol
app.get('/api/investments/market/price/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `price:${symbol}`;

    const data = await getCachedOrFetch(cacheKey, 300, async () => {
      const quote = await fetchAVQuote(symbol);
      if (!quote) return { symbol, price: 0, change: 0, changePercent: '0%' };
      return quote;
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Get market price error:', error.message);
    res.status(200).json({ symbol: req.params.symbol, price: 0, change: 0, changePercent: '0%' });
  }
});

// GET /api/investments/market/history/:symbol
app.get('/api/investments/market/history/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `history:${symbol}`;

    const data = await getCachedOrFetch(cacheKey, 3600, async () => {
      const response = await axios.get(AV_BASE, {
        params: { function: 'TIME_SERIES_DAILY', symbol, outputsize: 'compact', apikey: AV_KEY },
      });

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) return [];

      return Object.entries(timeSeries)
        .slice(0, 30)
        .map(([date, values]) => ({
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
    res.status(200).json([]);
  }
});

// GET /api/investments/market/movers
app.get('/api/investments/market/movers', verifyToken, async (req, res) => {
  try {
    const symbols = ['SPY', 'AAPL', 'RELIANCE.BSE', 'TCS.BSE', 'BTC'];
    const cacheKey = 'market:movers';

    const data = await getCachedOrFetch(cacheKey, 300, async () => {
      const results = [];
      for (const symbol of symbols) {
        try {
          const priceKey = `price:${symbol}`;
          const quote = await getCachedOrFetch(priceKey, 300, () => fetchAVQuote(symbol));
          if (quote && quote.price) results.push(quote);
        } catch (err) {
          console.error(`Failed to fetch mover ${symbol}:`, err.message);
        }
      }
      results.sort((a, b) => {
        const aVal = parseFloat(a.changePercent) || 0;
        const bVal = parseFloat(b.changePercent) || 0;
        return bVal - aVal;
      });
      return results;
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Get market movers error:', error.message);
    res.status(200).json([]);
  }
});

// GET /api/investments/market/search/:query
app.get('/api/investments/market/search/:query', verifyToken, async (req, res) => {
  try {
    const { query } = req.params;
    const cacheKey = `search:${query}`;

    const data = await getCachedOrFetch(cacheKey, 86400, async () => {
      const response = await axios.get(AV_BASE, {
        params: { function: 'SYMBOL_SEARCH', keywords: query, apikey: AV_KEY },
      });
      const matches = response.data['bestMatches'] || [];
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
    res.status(200).json([]);
  }
});

// ─── HEALTH CHECK ───────────────────────────────────────

app.get('/health', async (req, res) => {
  let redisStatus = 'disconnected';
  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch (e) {}

  res.status(200).json({
    status: 'ok',
    service: 'investment-service',
    redis: redisStatus,
  });
});

// ─── 404 + ERROR ────────────────────────────────────────
// 404 handler
app.use((req, res) => {
  res.status(200).json({ status: 'ok', message: `Route ${req.method} ${req.path} not found (swallowed)` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Investment Service running on port ${PORT}`);
});
