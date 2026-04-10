import { aiService } from '../services/aiService';

// ─────────────────────────────────────────────────────────────
// AI Service — Integration Tests
//
// Tests ONLY real API endpoints:
//   GET  /health
//   POST /analyze
//   GET  /investment-portfolio
//
// No internal helper tests. Requires network.
// ─────────────────────────────────────────────────────────────

// ── Result Tracker ──────────────────────────────────────────

const results = { passed: 0, failed: 0, skipped: 0, total: 0 };

const assert = (label, condition, detail) => {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✅ ${label}`);
  } else {
    results.failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const skip = (label, reason) => {
  results.total++;
  results.skipped++;
  console.log(`  ⏭️  ${label} — ${reason}`);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const section = (title) => {
  console.log('');
  console.log(`  ── [API TEST] ${title} ──`);
};

// ── Performance Timer ───────────────────────────────────────

const perf = (label, startMs) => {
  const elapsed = Date.now() - startMs;
  console.log(`  [PERF] ${label} took ${elapsed}ms`);
  return elapsed;
};

// ── Test Data ───────────────────────────────────────────────

const sampleTransactions = [
  { date: '2024-03-01', amount: 250, category: ['Food and Drink'] },
  { date: '2024-03-01', amount: 120, category: ['Transportation'] },
  { date: '2024-03-02', amount: -5000, category: ['Salary'] },
  { date: '2024-03-03', amount: 80, category: ['Entertainment'] },
  { date: '2024-03-04', amount: 450, category: ['Shopping'] },
  { date: '2024-03-05', amount: 60, category: ['RENT_AND_UTILITIES'] },
  { date: '2024-03-06', amount: 35, category: ['Coffee Shop'] },
  { date: '2024-03-07', amount: 200, category: ['Groceries'] },
];

// ─────────────────────────────────────────────────────────────
// 1. GET /health
// ─────────────────────────────────────────────────────────────

const testHealthCheck = async () => {
  section('GET /health');

  try {
    const t0 = Date.now();
    const res = await aiService.checkHealth();
    perf('Health check', t0);

    console.log(`  Response: ${JSON.stringify(res)}`);

    assert(
      'returns object with "status" field',
      res && typeof res === 'object' && 'status' in res,
      `got ${JSON.stringify(res)}`,
    );

    assert(
      'status is "ok" or "offline"',
      res.status === 'ok' || res.status === 'offline',
      `got "${res.status}"`,
    );

    return res.status === 'ok';
  } catch (err) {
    assert('checkHealth() does not throw', false, err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// 2. POST /analyze
// ─────────────────────────────────────────────────────────────

const testAnalyze = async () => {
  section('POST /analyze');

  try {
    console.log(`  Sending ${sampleTransactions.length} transactions, balance=15000...`);

    const t0 = Date.now();
    const res = await aiService.analyzeTransactions(sampleTransactions, 15000);
    const elapsed = perf('Analyze', t0);

    // Performance check
    assert(
      'response time < 30s',
      elapsed < 30000,
      `took ${elapsed}ms`,
    );

    console.log('  Response keys:', Object.keys(res).join(', '));

    // ── Required fields — presence + type + range ────────
    assert(
      'weekly_spend is number ≥ 0',
      typeof res.weekly_spend === 'number' && res.weekly_spend >= 0,
      `got ${res.weekly_spend}`,
    );

    assert(
      'monthly_estimate is number ≥ 0',
      typeof res.monthly_estimate === 'number' && res.monthly_estimate >= 0,
      `got ${res.monthly_estimate}`,
    );

    const validTrends = ['increasing', 'decreasing', 'stable'];
    assert(
      `spending_trend ∈ ${JSON.stringify(validTrends)}`,
      typeof res.spending_trend === 'string' && validTrends.includes(res.spending_trend),
      `got "${res.spending_trend}"`,
    );

    assert(
      'risk_score ∈ [0, 1]',
      typeof res.risk_score === 'number' && res.risk_score >= 0 && res.risk_score <= 1,
      `got ${res.risk_score}`,
    );

    const validTypes = ['low', 'moderate', 'high'];
    assert(
      `spender_type ∈ ${JSON.stringify(validTypes)}`,
      typeof res.spender_type === 'string' && validTypes.includes(res.spender_type),
      `got "${res.spender_type}"`,
    );

    assert(
      'financial_health_score ∈ [0, 100]',
      typeof res.financial_health_score === 'number' &&
        res.financial_health_score >= 0 &&
        res.financial_health_score <= 100,
      `got ${res.financial_health_score}`,
    );

    assert(
      'suggestions is array',
      Array.isArray(res.suggestions),
      `got ${typeof res.suggestions}`,
    );

    assert(
      'investment_advice is non-empty string',
      typeof res.investment_advice === 'string' && res.investment_advice.length > 0,
      `got "${res.investment_advice?.slice(0, 40)}..."`,
    );

    // ── Optional / conditional fields ─────────────────────
    const optionals = ['cashflow', 'spending_heatmap', 'top_spending_category'];
    optionals.forEach((field) => {
      if (field in res && res[field] !== null && res[field] !== undefined) {
        console.log(`  ℹ️  "${field}" present (${typeof res[field]})`);
      } else {
        console.log(`  ℹ️  "${field}" absent — OK (conditional)`);
      }
    });

    // Log suggestions count
    console.log(`  ℹ️  ${res.suggestions.length} suggestion(s) returned`);

    return res;
  } catch (err) {
    assert('analyzeTransactions() does not throw', false, err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// 3. GET /investment-portfolio
// ─────────────────────────────────────────────────────────────

const testPortfolio = async () => {
  section('GET /investment-portfolio');

  try {
    console.log('  Params: monthly_spend=15000, health_score=65');

    const t0 = Date.now();
    const res = await aiService.getInvestmentPortfolio(15000, 65);
    perf('Portfolio', t0);

    console.log('  Response:', JSON.stringify(res, null, 2));

    // portfolio must be an array
    assert(
      '"portfolio" is array',
      res && Array.isArray(res.portfolio),
      `got ${typeof res?.portfolio}`,
    );

    if (!Array.isArray(res.portfolio)) return;

    assert(`portfolio has ${res.portfolio.length} items`, res.portfolio.length > 0, 'empty array');

    // Validate each item
    if (res.portfolio.length > 0) {
      let allValid = true;

      res.portfolio.forEach((item, idx) => {
        const hasAsset = typeof item.asset === 'string' && item.asset.length > 0;
        const hasAlloc = typeof item.allocation === 'number' && item.allocation >= 0 && item.allocation <= 1;

        if (!hasAsset) {
          assert(`[${idx}] asset is non-empty string`, false, JSON.stringify(item));
          allValid = false;
        }
        if (!hasAlloc) {
          assert(`[${idx}] allocation ∈ [0, 1]`, false, JSON.stringify(item));
          allValid = false;
        }
      });

      if (allValid) {
        assert('all items have valid asset + allocation', true);
      }

      // Sum of allocations ≈ 1.0 (±0.1 tolerance)
      const total = res.portfolio.reduce((s, p) => s + (p.allocation || 0), 0);
      const rounded = Math.round(total * 100) / 100;
      assert(
        `allocation sum ≈ 1.0 (±0.1) — got ${rounded}`,
        Math.abs(rounded - 1.0) <= 0.1,
        `sum = ${rounded}`,
      );
    }
  } catch (err) {
    assert('getInvestmentPortfolio() does not throw', false, err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. Invalid Input Handling (API safety)
// ─────────────────────────────────────────────────────────────

const testInvalidInputs = async () => {
  section('Invalid Inputs — API safety');

  // analyzeTransactions with empty array
  try {
    const r1 = await aiService.analyzeTransactions([], 0);
    assert(
      'empty transactions → fallback (no crash)',
      r1 && typeof r1 === 'object' && 'financial_health_score' in r1,
    );
  } catch (err) {
    assert('empty transactions → no crash', false, err.message);
  }

  // analyzeTransactions with null
  try {
    const r2 = await aiService.analyzeTransactions(null, null);
    assert(
      'null → fallback (no crash)',
      r2 && typeof r2 === 'object' && 'financial_health_score' in r2,
    );
  } catch (err) {
    assert('null → no crash', false, err.message);
  }

  // Portfolio with monthly_spend = 0
  try {
    const r3 = await aiService.getInvestmentPortfolio(0, 50);
    assert(
      'monthly_spend=0 → empty portfolio (no crash)',
      r3 && Array.isArray(r3.portfolio) && r3.portfolio.length === 0,
    );
  } catch (err) {
    assert('monthly_spend=0 → no crash', false, err.message);
  }

  // Portfolio with health_score > 100
  try {
    const r4 = await aiService.getInvestmentPortfolio(15000, 999);
    assert(
      'health_score=999 → handled (no crash)',
      r4 && typeof r4 === 'object' && 'portfolio' in r4,
    );
  } catch (err) {
    assert('health_score=999 → no crash', false, err.message);
  }

  // Portfolio with negative spend
  try {
    const r5 = await aiService.getInvestmentPortfolio(-500, 50);
    assert(
      'negative spend → empty portfolio',
      r5 && Array.isArray(r5.portfolio) && r5.portfolio.length === 0,
    );
  } catch (err) {
    assert('negative spend → no crash', false, err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────

export const runIntegrationTests = async () => {
  results.passed = 0;
  results.failed = 0;
  results.skipped = 0;
  results.total = 0;

  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  🌐  AI SERVICE — INTEGRATION TESTS           ║');
  console.log('║  Real API endpoints. Requires network.        ║');
  console.log('╚═══════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // ─ Gate: Health check ──────────────────────────────────
    const isOnline = await testHealthCheck();
    await delay(1000);

    if (!isOnline) {
      console.log('');
      console.log('  ⚠️  AI API is offline or cold-starting (Render free tier).');
      console.log('  ⚠️  Skipping /analyze and /investment-portfolio tests.');
      console.log('  ⚠️  Cold start can take 30–60 seconds. Try again shortly.');

      // Count remaining tests as skipped
      skip('POST /analyze', 'API offline');
      skip('GET /investment-portfolio', 'API offline');
      skip('Invalid input tests', 'API offline');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('');
      console.log(`  ── [API TEST] Done (${elapsed}s): ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.skipped} skipped ──`);
      console.log('');
      return { ...results };
    }

    // ─ POST /analyze ──────────────────────────────────────
    await testAnalyze();
    await delay(1500);

    // ─ GET /investment-portfolio ───────────────────────────
    await testPortfolio();
    await delay(1000);

    // ─ Invalid inputs ─────────────────────────────────────
    await testInvalidInputs();
  } catch (err) {
    console.error(`\n  💥 Integration test runner crashed: ${err.message}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log(`  ── [API TEST] Done (${elapsed}s): ${results.passed}/${results.total} passed, ${results.failed} failed, ${results.skipped} skipped ──`);
  console.log('');

  return { ...results };
};

export default runIntegrationTests;
