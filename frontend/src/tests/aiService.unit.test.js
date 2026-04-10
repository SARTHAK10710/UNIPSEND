import {
  transformToAIFormat,
  formatTime,
  mapCategory,
  getEmptyAIResponse,
} from '../services/aiService';

// ─────────────────────────────────────────────────────────────
// AI Service — Unit Tests
//
// Tests ONLY internal helper functions.
// Zero network calls. Runs fully offline.
// ─────────────────────────────────────────────────────────────

// ── Result Tracker ──────────────────────────────────────────

const results = { passed: 0, failed: 0, total: 0 };

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

const section = (title) => {
  console.log('');
  console.log(`  ── [UNIT TEST] ${title} ──`);
};

// ─────────────────────────────────────────────────────────────
// 1. formatTime()
// ─────────────────────────────────────────────────────────────

const testFormatTime = () => {
  section('formatTime()');

  // Date-only → appends default time
  const r1 = formatTime('2024-03-01');
  assert(
    'date-only → "2024-03-01 10:00:00"',
    r1 === '2024-03-01 10:00:00',
    `got "${r1}"`,
  );

  // ISO string → strips T, trims
  const r2 = formatTime('2024-03-01T14:30:00.000Z');
  assert(
    'ISO → "2024-03-01 14:30:00"',
    r2 === '2024-03-01 14:30:00',
    `got "${r2}"`,
  );

  // Already formatted → passthrough
  const r3 = formatTime('2024-12-25 08:15:30');
  assert(
    'already formatted → passthrough',
    r3 === '2024-12-25 08:15:30',
    `got "${r3}"`,
  );

  // ISO without milliseconds
  const r4 = formatTime('2024-06-15T09:00:00Z');
  assert(
    'ISO no ms → "2024-06-15 09:00:00"',
    r4 === '2024-06-15 09:00:00',
    `got "${r4}"`,
  );

  // null → today + default time
  const r5 = formatTime(null);
  assert(
    'null → today + "10:00:00"',
    /^\d{4}-\d{2}-\d{2} 10:00:00$/.test(r5),
    `got "${r5}"`,
  );

  // undefined → today + default time
  const r6 = formatTime(undefined);
  assert(
    'undefined → today + "10:00:00"',
    /^\d{4}-\d{2}-\d{2} 10:00:00$/.test(r6),
    `got "${r6}"`,
  );

  // Empty string
  const r7 = formatTime('');
  assert(
    'empty string → does not crash',
    typeof r7 === 'string' && r7.length > 0,
    `got "${r7}"`,
  );

  // Number input
  const r8 = formatTime(1709280000000);
  assert(
    'timestamp number → valid string',
    typeof r8 === 'string' && r8.length >= 10,
    `got "${r8}"`,
  );
};

// ─────────────────────────────────────────────────────────────
// 2. mapCategory()
// ─────────────────────────────────────────────────────────────

const testMapCategory = () => {
  section('mapCategory()');

  // ── Food variants ─────────────────────────────────────
  const foodInputs = [
    ['Food and Drink'],
    ['Restaurant'],
    'coffee',
    'dining',
    'bakery',
    'groceries',
    ['fast food'],
  ];
  foodInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "food"`, r === 'food', `got "${r}"`);
  });

  // ── Transport variants ────────────────────────────────
  const transportInputs = [
    ['Transportation'],
    'uber',
    'lyft',
    'taxi',
    ['Travel'],
    'airlines',
    'gas',
  ];
  transportInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "transport"`, r === 'transport', `got "${r}"`);
  });

  // ── Shopping variants ─────────────────────────────────
  const shopInputs = [['Shopping'], 'retail', ['GENERAL_MERCHANDISE'], 'clothing', 'amazon'];
  shopInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "shopping"`, r === 'shopping', `got "${r}"`);
  });

  // ── Entertainment variants ────────────────────────────
  const entInputs = [['Entertainment'], 'movies', 'games', 'streaming', 'sports'];
  entInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "entertainment"`, r === 'entertainment', `got "${r}"`);
  });

  // ── Subscriptions variants ────────────────────────────
  const subInputs = [['RENT_AND_UTILITIES'], 'subscription', 'services', 'internet'];
  subInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "subscriptions"`, r === 'subscriptions', `got "${r}"`);
  });

  // ── Salary variants ───────────────────────────────────
  const salInputs = [['Salary'], 'income', 'payroll', 'deposit'];
  salInputs.forEach((input) => {
    const r = mapCategory(input);
    assert(`${JSON.stringify(input)} → "salary"`, r === 'salary', `got "${r}"`);
  });

  // ── Fallbacks to "others" ─────────────────────────────
  const otherInputs = [
    { input: null, label: 'null' },
    { input: undefined, label: 'undefined' },
    { input: '', label: 'empty string' },
    { input: ['Unknown XYZ'], label: '["Unknown XYZ"]' },
    { input: 42, label: 'number 42' },
  ];
  otherInputs.forEach(({ input, label }) => {
    const r = mapCategory(input);
    assert(`${label} → "others"`, r === 'others', `got "${r}"`);
  });
};

// ─────────────────────────────────────────────────────────────
// 3. transformToAIFormat()
// ─────────────────────────────────────────────────────────────

const testTransformToAIFormat = () => {
  section('transformToAIFormat()');

  const input = [
    { date: '2024-03-01', amount: 250, category: ['Food and Drink'] },
    { date: '2024-03-01', amount: 120, category: ['Transportation'] },
    { date: '2024-03-02', amount: -5000, category: ['Salary'] },
    { date: '2024-03-02', amount: 0, category: ['Other'] },
    { date: '2024-03-03', amount: 80, category: ['Entertainment'] },
  ];

  const result = transformToAIFormat(input);

  // Filters out amount === 0
  assert(
    'filters zero-amount transactions',
    result.length === 4,
    `expected 4, got ${result.length}`,
  );

  // Every item has required keys
  const hasKeys = result.every(
    (tx) => 'time' in tx && 'amount' in tx && 'category' in tx,
  );
  assert('all items have keys: time, amount, category', hasKeys);

  // No extra keys
  const onlyKeys = result.every(
    (tx) => Object.keys(tx).length === 3,
  );
  assert('no extra keys (exactly 3 per item)', onlyKeys);

  // Time format YYYY-MM-DD HH:MM:SS
  const validTimes = result.every((tx) =>
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(tx.time),
  );
  assert('all time values match "YYYY-MM-DD HH:MM:SS"', validTimes);

  // Categories are normalized strings
  const validCats = ['food', 'transport', 'shopping', 'entertainment', 'subscriptions', 'salary', 'others'];
  const catsOk = result.every((tx) => validCats.includes(tx.category));
  assert('all categories normalized', catsOk);

  // Amount types are numbers
  const amountsOk = result.every((tx) => typeof tx.amount === 'number');
  assert('all amounts are numbers', amountsOk);

  // Negative amounts (income) preserved
  const salary = result.find((tx) => tx.category === 'salary');
  assert(
    'negative amount (income) sign preserved',
    salary && salary.amount < 0,
    `salary amount: ${salary?.amount}`,
  );

  // ── Edge cases ────────────────────────────────────────
  section('transformToAIFormat() — edge cases');

  const edgeCases = [
    { input: [], label: 'empty array', expectLen: 0 },
    { input: null, label: 'null', expectLen: 0 },
    { input: undefined, label: 'undefined', expectLen: 0 },
    { input: 'string', label: 'string', expectLen: 0 },
    { input: 42, label: 'number', expectLen: 0 },
    { input: {}, label: 'plain object', expectLen: 0 },
    { input: [null, null], label: 'array of nulls', expectLen: 0 },
    { input: [{ x: 1 }, { y: 2 }], label: 'malformed objects', expectLen: 0 },
  ];

  edgeCases.forEach(({ input: badInput, label, expectLen }) => {
    try {
      const out = transformToAIFormat(badInput);
      assert(
        `${label} → empty array, no crash`,
        Array.isArray(out) && out.length === expectLen,
        `got length ${out?.length}`,
      );
    } catch (err) {
      results.total++;
      results.failed++;
      console.log(`  ❌ ${label} — CRASHED: ${err.message}`);
    }
  });

  // String amounts get parsed
  const stringAmts = transformToAIFormat([
    { date: '2024-01-01', amount: '150', category: 'food' },
  ]);
  assert(
    'string amount "150" parsed to number',
    stringAmts.length === 1 && stringAmts[0].amount === 150,
    `got ${stringAmts[0]?.amount}`,
  );
};

// ─────────────────────────────────────────────────────────────
// 4. getEmptyAIResponse()
// ─────────────────────────────────────────────────────────────

const testGetEmptyAIResponse = () => {
  section('getEmptyAIResponse()');

  const fb = getEmptyAIResponse();

  // Required fields — type check
  const requiredFields = {
    weekly_spend: 'number',
    monthly_estimate: 'number',
    daily_spend: 'object',
    category_distribution: 'object',
    spending_trend: 'string',
    risk_score: 'number',
    spender_type: 'string',
    financial_health_score: 'number',
    suggestions: 'array',
    investment_advice: 'string',
  };

  Object.entries(requiredFields).forEach(([key, expectedType]) => {
    const present = key in fb;
    if (!present) {
      assert(`"${key}" present`, false, 'missing');
      return;
    }
    const val = fb[key];
    let typeOk;
    if (expectedType === 'array') typeOk = Array.isArray(val);
    else typeOk = typeof val === expectedType;

    assert(`"${key}" is ${expectedType}`, typeOk, `got ${typeof val}`);
  });

  // Optional fields — must exist as null
  const optionalFields = ['cashflow', 'category_percentages', 'spending_heatmap', 'top_spending_category'];
  optionalFields.forEach((key) => {
    assert(`"${key}" present (null)`, key in fb && fb[key] === null, `got ${fb[key]}`);
  });

  // Default values
  assert('financial_health_score = 50', fb.financial_health_score === 50);
  assert('risk_score = 0.5', fb.risk_score === 0.5);
  assert('spending_trend = "stable"', fb.spending_trend === 'stable');
  assert('spender_type = "moderate"', fb.spender_type === 'moderate');
  assert('weekly_spend = 0', fb.weekly_spend === 0);
  assert('monthly_estimate = 0', fb.monthly_estimate === 0);
  assert('suggestions is empty array', Array.isArray(fb.suggestions) && fb.suggestions.length === 0);
  assert('investment_advice is non-empty string', typeof fb.investment_advice === 'string' && fb.investment_advice.length > 0);

  // Immutability — each call returns a new object
  const fb2 = getEmptyAIResponse();
  assert('returns new object each call (not same reference)', fb !== fb2);
};

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────

export const runUnitTests = () => {
  results.passed = 0;
  results.failed = 0;
  results.total = 0;

  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  🧪  AI SERVICE — UNIT TESTS                  ║');
  console.log('║  Internal helpers only. No network required.  ║');
  console.log('╚═══════════════════════════════════════════════╝');

  try {
    testFormatTime();
    testMapCategory();
    testTransformToAIFormat();
    testGetEmptyAIResponse();
  } catch (err) {
    console.error(`\n  💥 Unit test runner crashed: ${err.message}`);
  }

  console.log('');
  console.log(`  ── [UNIT TEST] Done: ${results.passed}/${results.total} passed, ${results.failed} failed ──`);
  console.log('');

  return { ...results };
};

export default runUnitTests;
