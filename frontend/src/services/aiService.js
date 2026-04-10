import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// Unispend AI Service
// External API: https://unispend-ai.onrender.com
// Standalone client — does NOT use the gateway-authenticated API
// ─────────────────────────────────────────────────────────────

const AI_BASE_URL = 'https://unispend-ai.onrender.com';
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────
// Category Mapping: Plaid → AI
// ─────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  food: ['food', 'dining', 'restaurant', 'restaurants', 'coffee', 'cafe', 'bakery', 'groceries', 'fast food', 'food and drink'],
  transport: ['transport', 'transportation', 'travel', 'uber', 'lyft', 'taxi', 'gas', 'fuel', 'airlines', 'car'],
  shopping: ['shopping', 'retail', 'shops', 'general merchandise', 'clothing', 'electronics', 'amazon'],
  entertainment: ['entertainment', 'movies', 'games', 'gaming', 'music', 'streaming', 'recreation', 'sports'],
  subscriptions: ['subscriptions', 'subscription', 'services', 'service', 'rent and utilities', 'utilities', 'internet', 'phone'],
  salary: ['salary', 'income', 'payroll', 'deposit', 'transfer', 'interest'],
};

/**
 * Map a Plaid category (string or array) to a normalized AI category.
 * @param {string|string[]} categoryInput
 * @returns {string}
 */
const mapCategory = (categoryInput) => {
  if (!categoryInput) return 'others';

  const raw = Array.isArray(categoryInput)
    ? categoryInput.join(' ')
    : String(categoryInput);

  const lower = raw.toLowerCase();

  for (const [aiCategory, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return aiCategory;
    }
  }

  return 'others';
};

// ─────────────────────────────────────────────────────────────
// Time Formatting
// ─────────────────────────────────────────────────────────────

/**
 * Convert a date string to "YYYY-MM-DD HH:MM:SS".
 * Adds default time "10:00:00" if only a date is provided.
 * @param {string} dateStr
 * @returns {string}
 */
const formatTime = (dateStr) => {
  if (!dateStr) return new Date().toISOString().slice(0, 10) + ' 10:00:00';

  const str = String(dateStr).trim();

  // Already has time component (contains a space or T with time)
  if (/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)) {
    return str.replace('T', ' ').slice(0, 19);
  }

  // Date only → append default time
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str} 10:00:00`;
  }

  // Try to parse as Date
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace('T', ' ').slice(0, 19);
    }
  } catch (_) {
    // fall through
  }

  return str + ' 10:00:00';
};

// ─────────────────────────────────────────────────────────────
// Data Transformation: Plaid → AI Format
// ─────────────────────────────────────────────────────────────

/**
 * Transform Plaid transactions into the AI API's expected format.
 *
 * Plaid format:  { date, amount, category }
 * AI format:     { time: "YYYY-MM-DD HH:MM:SS", amount: number, category: string }
 *
 * @param {Array} transactions - Plaid transaction objects
 * @returns {Array} AI-formatted transactions
 */
const transformToAIFormat = (transactions) => {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  return transactions
    .filter((tx) => tx && tx.amount !== undefined && tx.amount !== 0)
    .map((tx) => ({
      time: formatTime(tx.date),
      amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,
      category: mapCategory(tx.category),
    }));
};

// ─────────────────────────────────────────────────────────────
// Fallback Response
// ─────────────────────────────────────────────────────────────

/**
 * Returns a safe, empty AI response when the API is unavailable
 * or when there are no transactions to analyze.
 * @returns {Object}
 */
const getEmptyAIResponse = () => ({
  weekly_spend: 0,
  monthly_estimate: 0,
  daily_spend: {},
  category_distribution: {},
  spending_trend: 'stable',
  risk_score: 0.5,
  spender_type: 'moderate',
  financial_health_score: 50,
  suggestions: [],
  investment_advice: 'Connect your bank to get personalized insights',
  cashflow: null,
  category_percentages: null,
  spending_heatmap: null,
  top_spending_category: null,
});

// ─────────────────────────────────────────────────────────────
// Retry Helper
// ─────────────────────────────────────────────────────────────

/**
 * Execute an async function with exponential backoff retry.
 * @param {Function} fn - async function to execute
 * @param {number} retries - max retry count
 * @param {number} baseDelay - base delay in ms (doubles each retry)
 * @returns {Promise<*>}
 */
const withRetry = async (fn, retries = MAX_RETRIES, baseDelay = BASE_DELAY_MS) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[AI] retry attempt ${attempt + 1}/${retries} — waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if the AI service is online.
 * @returns {Promise<{status: string}>}
 */
const checkHealth = async () => {
  try {
    const res = await aiClient.get('/health');
    console.log('[AI] health check:', res.data);
    return res.data || { status: 'ok' };
  } catch (err) {
    console.log('[AI] health check axios failed:', err.message, err.code);
    // Fallback: try native fetch (bypasses axios interceptors / Flipper proxy)
    try {
      console.log('[AI] trying fetch fallback...');
      const fetchRes = await fetch(`${AI_BASE_URL}/health`);
      const data = await fetchRes.json();
      console.log('[AI] fetch fallback succeeded:', data);
      return data || { status: 'ok' };
    } catch (fetchErr) {
      console.log('[AI] fetch fallback also failed:', fetchErr.message);
      return { status: 'offline' };
    }
  }
};

/**
 * Send transactions to the AI service for analysis.
 *
 * @param {Array} transactions  - Raw Plaid transactions
 * @param {number} [currentBalance] - Optional current balance
 * @returns {Promise<Object>} AI analysis response or fallback
 */
const analyzeTransactions = async (transactions, currentBalance) => {
  // ── Input validation ──────────────────────────────────────
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    console.log('[AI] no transactions to analyze — returning fallback');
    return getEmptyAIResponse();
  }

  // ── Transform data ────────────────────────────────────────
  const aiTransactions = transformToAIFormat(transactions);

  if (aiTransactions.length === 0) {
    console.log('[AI] all transactions filtered out — returning fallback');
    return getEmptyAIResponse();
  }

  console.log(`[AI] analyzing ${aiTransactions.length} transactions...`);

  // ── Build request body ────────────────────────────────────
  const body = { transactions: aiTransactions };

  if (currentBalance !== undefined && currentBalance !== null && !isNaN(currentBalance)) {
    body.current_balance = Number(currentBalance);
  }

  // ── Call API with retry ───────────────────────────────────
  try {
    const res = await withRetry(async () => {
      const response = await aiClient.post('/analyze', body);
      return response;
    });

    if (res.data) {
      console.log('[AI] response received ✓');
      return res.data;
    }

    console.log('[AI] empty response body — returning fallback');
    return getEmptyAIResponse();
  } catch (err) {
    console.error('[AI] error after retries:', err.message);

    // Return specific error info for UI
    if (err.response) {
      console.error(`[AI] server responded with ${err.response.status}:`, err.response.data);
    }

    return getEmptyAIResponse();
  }
};

/**
 * Get AI-recommended investment portfolio allocation.
 *
 * @param {number} monthlySpend - Monthly spending amount
 * @param {number} healthScore  - Financial health score (0–100)
 * @returns {Promise<{portfolio: Array}>}
 */
const getInvestmentPortfolio = async (monthlySpend, healthScore) => {
  // ── Input validation ──────────────────────────────────────
  if (!monthlySpend || monthlySpend <= 0) {
    console.log('[AI] invalid monthly_spend — returning empty portfolio');
    return { portfolio: [] };
  }

  const clampedScore = Math.max(0, Math.min(100, healthScore || 50));

  console.log(`[AI] fetching portfolio — spend: ${monthlySpend}, health: ${clampedScore}`);

  // ── Call API with retry ───────────────────────────────────
  try {
    const res = await withRetry(async () => {
      const response = await aiClient.get('/investment-portfolio', {
        params: {
          monthly_spend: Math.round(monthlySpend),
          health_score: Math.round(clampedScore),
        },
      });
      return response;
    });

    if (res.data) {
      console.log('[AI] portfolio received ✓', res.data);
      return res.data;
    }

    return { portfolio: [] };
  } catch (err) {
    console.error('[AI] portfolio error after retries:', err.message);

    if (err.response) {
      console.error(`[AI] server responded with ${err.response.status}:`, err.response.data);
    }

    return { portfolio: [] };
  }
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

export const aiService = {
  checkHealth,
  analyzeTransactions,
  getInvestmentPortfolio,
};

// Also export helpers for use in data transformation utilities
export {
  transformToAIFormat,
  formatTime,
  mapCategory,
  getEmptyAIResponse,
};

export default aiService;
