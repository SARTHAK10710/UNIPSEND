// ─────────────────────────────────────────────────────────────
// Smoke Test: Alpaca + Alpha Vantage API Connectivity
//
// Run this once from any screen to verify both services work.
// Import and call: runServiceSmokeTest()
// Check console logs for results.
// ─────────────────────────────────────────────────────────────

import { getAccount, getPositions, getLatestPrice } from '../services/alpacaService';
import { getStockData, getIndicator } from '../services/alphaVantageService';

export const runServiceSmokeTest = async () => {
  console.log('═══════════════════════════════════════════');
  console.log('[SmokeTest] Starting API connectivity test...');
  console.log('═══════════════════════════════════════════');

  const results = {};

  // ── Test 1: Alpaca Account ──────────────────────────────
  try {
    const account = await getAccount();
    results.alpacaAccount = '✅ OK';
    console.log('[SmokeTest] Alpaca Account:', {
      equity: account.equity,
      buying_power: account.buying_power,
      status: account.status,
    });
  } catch (err) {
    results.alpacaAccount = `❌ ${err.message}`;
    console.error('[SmokeTest] Alpaca Account FAILED:', err.message);
  }

  // ── Test 2: Alpaca Positions ────────────────────────────
  try {
    const positions = await getPositions();
    results.alpacaPositions = `✅ ${positions.length} positions`;
    console.log('[SmokeTest] Alpaca Positions:', positions.length);
  } catch (err) {
    results.alpacaPositions = `❌ ${err.message}`;
    console.error('[SmokeTest] Alpaca Positions FAILED:', err.message);
  }

  // ── Test 3: Alpaca Latest Price ─────────────────────────
  try {
    const price = await getLatestPrice('AAPL');
    results.alpacaPrice = `✅ AAPL=$${price}`;
    console.log('[SmokeTest] Alpaca AAPL Price:', price);
  } catch (err) {
    results.alpacaPrice = `❌ ${err.message}`;
    console.error('[SmokeTest] Alpaca Price FAILED:', err.message);
  }

  // ── Test 4: Alpha Vantage Stock Data ────────────────────
  try {
    const stockData = await getStockData('AAPL');
    const dayCount = Object.keys(stockData.timeSeries || {}).length;
    results.avStockData = `✅ ${dayCount} days`;
    console.log('[SmokeTest] Alpha Vantage AAPL:', dayCount, 'days');
  } catch (err) {
    results.avStockData = `❌ ${err.message}`;
    console.error('[SmokeTest] Alpha Vantage Stock FAILED:', err.message);
  }

  // ── Test 5: Alpha Vantage RSI Indicator ─────────────────
  try {
    const rsi = await getIndicator('AAPL', 'RSI');
    const pointCount = Object.keys(rsi.analysis || {}).length;
    results.avIndicator = `✅ RSI ${pointCount} points`;
    console.log('[SmokeTest] Alpha Vantage RSI:', pointCount, 'data points');
  } catch (err) {
    results.avIndicator = `❌ ${err.message}`;
    console.error('[SmokeTest] Alpha Vantage RSI FAILED:', err.message);
  }

  // ── Summary ─────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('[SmokeTest] RESULTS:');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`  ${test}: ${result}`);
  });
  console.log('═══════════════════════════════════════════');

  return results;
};

export default runServiceSmokeTest;
