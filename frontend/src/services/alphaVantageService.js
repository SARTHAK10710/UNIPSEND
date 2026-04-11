// ─────────────────────────────────────────────────────────────
// Alpha Vantage Market Data Service
//
// Handles all MARKET DATA and TECHNICAL INDICATOR queries via
// the Alpha Vantage REST API. This service is strictly for:
//   - Historical stock price data (TIME_SERIES_DAILY)
//   - Technical indicators (RSI, MACD, SMA, EMA, etc.)
//
// ⚠️  This is NOT for trading or portfolio — use
//     alpacaService.js for that.
//
// No SDK required — uses native fetch.
// API key is read from .env via react-native-config.
// ─────────────────────────────────────────────────────────────

import Config from 'react-native-config';

// ── Configuration ───────────────────────────────────────────
const ALPHA_VANTAGE_KEY = Config.ALPHA_VANTAGE_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

if (!ALPHA_VANTAGE_KEY) {
  console.warn(
    '[AlphaVantage] API key not found in .env — market data features will be unavailable.',
  );
}

// ── Helper: fetch with error handling ───────────────────────
// NOTE: We manually build the URL query string because React
// Native's Hermes engine doesn't fully support URLSearchParams.
const avFetch = async (params) => {
  const allParams = { ...params, apikey: ALPHA_VANTAGE_KEY };
  const queryString = Object.entries(allParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${BASE_URL}?${queryString}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[AlphaVantage] ${response.status}:`, errorBody);
    throw new Error(`Alpha Vantage API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Alpha Vantage returns error messages inside the JSON body
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage: ${data['Error Message']}`);
  }

  if (data['Note']) {
    console.warn('[AlphaVantage] rate-limit note:', data['Note']);
  }

  return data;
};

// ─────────────────────────────────────────────────────────────
// Exported Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get daily historical stock price data.
 *
 * @param {string} symbol     - Stock symbol (e.g. "AAPL", "RELIANCE.BSE")
 * @param {string} outputSize - "compact" (last 100 days) or "full" (20+ years)
 * @returns {Object} Time series data with dates as keys
 *
 * Response shape:
 * {
 *   "Meta Data": { ... },
 *   "Time Series (Daily)": {
 *     "2024-01-15": { "1. open": "...", "2. high": "...", ... },
 *     ...
 *   }
 * }
 */
export const getStockData = async (symbol, outputSize = 'compact') => {
  try {
    console.log(`[AlphaVantage] fetching daily data for ${symbol}...`);

    const data = await avFetch({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: outputSize,
    });

    const timeSeries = data['Time Series (Daily)'];

    if (!timeSeries) {
      console.warn(`[AlphaVantage] no time series data for ${symbol}`);
      return { meta: data['Meta Data'] || {}, timeSeries: {} };
    }

    console.log(
      `[AlphaVantage] ${symbol}: ${Object.keys(timeSeries).length} days loaded ✓`,
    );

    return {
      meta: data['Meta Data'] || {},
      timeSeries,
    };
  } catch (err) {
    console.error('[AlphaVantage] getStockData error:', err.message);
    throw err;
  }
};

/**
 * Get a technical indicator for a stock.
 *
 * Supported indicators: RSI, MACD, SMA, EMA, BBANDS, STOCH, ADX, CCI, AROON, etc.
 *
 * @param {string} symbol    - Stock symbol (e.g. "AAPL")
 * @param {string} indicator - Indicator function name (e.g. "RSI", "MACD")
 * @param {Object} [options] - Additional params (time_period, interval, series_type)
 * @returns {Object} Indicator data
 *
 * Response shape (e.g. RSI):
 * {
 *   "Meta Data": { ... },
 *   "Technical Analysis: RSI": {
 *     "2024-01-15": { "RSI": "65.2314" },
 *     ...
 *   }
 * }
 */
export const getIndicator = async (symbol, indicator, options = {}) => {
  try {
    const upperIndicator = indicator.toUpperCase();
    console.log(`[AlphaVantage] fetching ${upperIndicator} for ${symbol}...`);

    const params = {
      function: upperIndicator,
      symbol,
      interval: options.interval || 'daily',
      time_period: options.time_period || '14',
      series_type: options.series_type || 'close',
      ...options,
    };

    // Remove options that were spread to avoid duplicates
    delete params.interval;
    delete params.time_period;
    delete params.series_type;

    // Re-add with correct values
    params.interval = options.interval || 'daily';
    params.time_period = String(options.time_period || 14);
    params.series_type = options.series_type || 'close';

    const data = await avFetch(params);

    // The indicator data key varies: "Technical Analysis: RSI", etc.
    const analysisKey = Object.keys(data).find((k) =>
      k.startsWith('Technical Analysis'),
    );

    if (!analysisKey) {
      console.warn(`[AlphaVantage] no indicator data for ${upperIndicator}`);
      return { meta: data['Meta Data'] || {}, analysis: {} };
    }

    const analysis = data[analysisKey];

    console.log(
      `[AlphaVantage] ${symbol} ${upperIndicator}: ${Object.keys(analysis).length} data points ✓`,
    );

    return {
      meta: data['Meta Data'] || {},
      analysis,
    };
  } catch (err) {
    console.error('[AlphaVantage] getIndicator error:', err.message);
    throw err;
  }
};

// ── Default Export ───────────────────────────────────────────
export default {
  getStockData,
  getIndicator,
};
