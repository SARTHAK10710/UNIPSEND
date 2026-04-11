// ─────────────────────────────────────────────────────────────
// Alpaca Trading Service
//
// Handles all TRADING and PORTFOLIO operations via the
// Alpaca Paper Trading API. This service is strictly for:
//   - Account information
//   - Portfolio positions
//   - Placing market orders
//   - Latest trade prices
//
// ⚠️  This is NOT for market data/indicators — use
//     alphaVantageService.js for that.
//
// API keys are read from .env via react-native-config.
// Paper trading mode is always enabled.
// ─────────────────────────────────────────────────────────────

import Config from 'react-native-config';

// ── Configuration ───────────────────────────────────────────
const ALPACA_KEY_ID = Config.ALPACA_KEY_ID;
const ALPACA_SECRET_KEY = Config.ALPACA_SECRET_KEY;
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

if (!ALPACA_KEY_ID || !ALPACA_SECRET_KEY) {
  console.warn(
    '[AlpacaService] API keys not found in .env — trading features will be unavailable.',
  );
}

// ── Shared Headers ──────────────────────────────────────────
const headers = {
  'APCA-API-KEY-ID': ALPACA_KEY_ID,
  'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
  'Content-Type': 'application/json',
};

// ── Helper: fetch with error handling ───────────────────────
const alpacaFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[AlpacaService] ${response.status}:`, errorBody);
    throw new Error(`Alpaca API error ${response.status}: ${errorBody}`);
  }

  return response.json();
};

// ─────────────────────────────────────────────────────────────
// Exported Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get the current Alpaca paper trading account info.
 * Returns: account object with equity, buying_power, cash, etc.
 */
export const getAccount = async () => {
  try {
    console.log('[AlpacaService] fetching account...');
    const data = await alpacaFetch(`${ALPACA_BASE_URL}/v2/account`);
    console.log('[AlpacaService] account loaded ✓');
    return data;
  } catch (err) {
    console.error('[AlpacaService] getAccount error:', err.message);
    throw err;
  }
};

/**
 * Get all open positions in the portfolio.
 * Returns: array of position objects.
 */
export const getPositions = async () => {
  try {
    console.log('[AlpacaService] fetching positions...');
    const data = await alpacaFetch(`${ALPACA_BASE_URL}/v2/positions`);
    console.log(`[AlpacaService] ${data.length} positions loaded ✓`);
    return data;
  } catch (err) {
    console.error('[AlpacaService] getPositions error:', err.message);
    throw err;
  }
};

/**
 * Place a market order on Alpaca paper trading.
 *
 * @param {string} symbol - Stock/crypto symbol (e.g. "AAPL", "BTC/USD")
 * @param {number} qty    - Number of shares/units
 * @param {string} side   - "buy" or "sell"
 * @returns {Object} Order confirmation
 */
export const placeOrder = async (symbol, qty, side) => {
  try {
    console.log(`[AlpacaService] placing ${side} order: ${qty}x ${symbol}...`);

    const body = {
      symbol,
      qty: String(qty),
      side,
      type: 'market',
      time_in_force: 'gtc',
    };

    const data = await alpacaFetch(`${ALPACA_BASE_URL}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log('[AlpacaService] order placed ✓', data.id);
    return data;
  } catch (err) {
    console.error('[AlpacaService] placeOrder error:', err.message);
    throw err;
  }
};

/**
 * Get the latest trade price for a symbol.
 *
 * @param {string} symbol - Stock symbol (e.g. "AAPL")
 * @returns {number} Latest trade price
 */
export const getLatestPrice = async (symbol) => {
  try {
    console.log(`[AlpacaService] fetching latest price for ${symbol}...`);

    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/trades/latest`,
    );

    const price = data?.trade?.p ?? null;
    console.log(`[AlpacaService] ${symbol} price: $${price} ✓`);
    return price;
  } catch (err) {
    console.error('[AlpacaService] getLatestPrice error:', err.message);
    throw err;
  }
};

// ── Default Export ───────────────────────────────────────────
export default {
  getAccount,
  getPositions,
  placeOrder,
  getLatestPrice,
};
