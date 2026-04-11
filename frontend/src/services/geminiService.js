import { formatCurrency } from '../utils/formatCurrency';

// ─────────────────────────────────────────────────────────────
// AI Chat Service (Groq)
//
// Calls Groq's ultra-fast inference API (OpenAI-compatible)
// with the user's financial context to answer any question.
// Model: Llama 3.3 70B — fast, free, high quality.
// ─────────────────────────────────────────────────────────────

const GROQ_API_KEY = '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';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Build a rich system prompt with the user's real financial data.
 */
export const buildSystemPrompt = (ctx) => {
  const {
    riskScore, spenderType, suggestions, investmentAdvice,
    categorySorted, categoryTotal, recentTxs,
    totalIncome, totalExpense, savingsRate, burnRate, runway,
  } = ctx;

  const categoryLines = categorySorted.slice(0, 5).map(([cat, amt]) => {
    const pct = categoryTotal > 0 ? ((amt / categoryTotal) * 100).toFixed(1) : 0;
    return `- ${cat}: ${formatCurrency(amt)} (${pct}%)`;
  }).join('\n');

  const txLines = recentTxs.slice(0, 8).map((tx) => {
    const name = tx.merchant_name || tx.category || 'Transaction';
    return `- ${formatCurrency(Math.abs(tx.amount))} at ${name} (${tx.date})`;
  }).join('\n');

  return `You are Unispend Co-pilot, an AI financial advisor embedded inside a fintech app called Unispend.
You have REAL-TIME access to the user's financial data. Here is their current data:

FINANCIAL SNAPSHOT:
- Weekly spend: ${formatCurrency(ctx.weeklySpend)}
- Monthly estimate: ${formatCurrency(ctx.monthlyEstimate)}
- Daily average: ${formatCurrency(Math.round(ctx.dailyAvg))}
- Spending trend: ${ctx.spendingTrend}
- Financial health score: ${ctx.healthScore}/100
- Risk score: ${Math.round(riskScore * 100)}%
- Spender type: ${spenderType}
- Savings rate: ${savingsRate ? (savingsRate * 100).toFixed(1) + '%' : 'N/A'}
- Daily burn rate: ${formatCurrency(Math.round(burnRate))}
- Days of runway: ${runway || 'N/A'}
- Monthly income: ${formatCurrency(totalIncome)}
- Monthly expenses: ${formatCurrency(totalExpense)}
- Monthly spare: ${formatCurrency(Math.max(ctx.monthlyDisposable, 0))}

SPENDING BY CATEGORY:
${categoryLines || 'No category data'}

RECENT TRANSACTIONS:
${txLines || 'No recent transactions'}

AI SUGGESTIONS: ${suggestions.join('; ') || 'None'}
INVESTMENT ADVICE: ${investmentAdvice || 'None'}

RULES:
1. You ARE a financial advisor with access to the user's real data shown above.
2. ALWAYS use the actual numbers from the data above. Never say "I don't have access to your data".
3. For affordability questions: Calculate price vs monthly spare capacity, give timeline and savings plan.
4. For spending questions: Reference actual categories and amounts.
5. For investment questions: Consider their risk score, health score, and spare capacity.
6. For questions about app features (security, UX, account), answer based on the app being a fintech personal finance tracker with bank aggregation via Plaid, AI-powered insights, investment tracking, and cashback rewards.
7. Keep responses concise but informative. Use bullet points and bold text (**bold**) for key numbers.
8. If the user's data is insufficient to answer, say so and suggest what data they should connect.
9. For goal planning, always calculate concrete numbers: monthly savings needed, timeline, gap analysis.
10. Currency: Always use ₹ (Indian Rupee). Use lakh (₹1,00,000) and crore (₹1,00,00,000) for large amounts.
11. The app features: bank connection (Plaid), spending tracking, AI insights, investment tracking (Alpaca), cashback/rewards, savings goals, financial health score.
12. For security questions: The app uses Firebase auth, encrypted data, bank-grade security via Plaid, and does not store bank credentials.`;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Send a message to Groq with conversation history + financial context.
 * Uses OpenAI-compatible chat completions format.
 * Function name kept as chatWithGemini to avoid breaking useCopilot.js imports.
 */
export const chatWithGemini = async (userMessage, conversationHistory, systemPrompt) => {
  // Build messages array in OpenAI chat format
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (last 10 turns)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    });
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Groq] sending message${attempt > 0 ? ` (retry ${attempt}/${MAX_RETRIES})` : ''}...`);

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      // ── Handle 429 rate-limit with retry ──────────────────────
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const backoff = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 5000);
          console.warn(`[Groq] rate-limited (429), retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        console.warn('[Groq] rate-limit exceeded after retries, falling back to local engine');
        return null;
      }

      // ── Handle auth errors — don't retry ──────────────────────
      if (response.status === 401 || response.status === 403) {
        const errText = await response.text();
        console.error(`[Groq] auth error (${response.status}):`, errText);
        return null;
      }

      // ── Handle other non-OK statuses ──────────────────────────
      if (!response.ok) {
        const errText = await response.text();
        console.error('[Groq] API error:', response.status, errText);
        return null;
      }

      // ── Success ───────────────────────────────────────────────
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (text) {
        console.log('[Groq] response received ✓');
        return text.trim();
      }

      console.warn('[Groq] empty response');
      return null;
    } catch (err) {
      console.error('[Groq] error:', err.message);
      return null;
    }
  }

  return null;
};

export default { buildSystemPrompt, chatWithGemini };
