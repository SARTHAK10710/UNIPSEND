import { formatCurrency } from '../utils/formatCurrency';

// ─────────────────────────────────────────────────────────────
// Gemini Service
//
// Calls Google Gemini 2.0 Flash (free tier) with the user's
// financial context to answer any financial question.
// ─────────────────────────────────────────────────────────────

// 🔑  Get your free API key at: https://aistudio.google.com/apikey
const GEMINI_API_KEY = 'AIzaSyDfN82xzzvyAQnC6PyCGLpgnmhJCA1ws68';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Build a rich system prompt with ALL the user's financial data
 */
export const buildSystemPrompt = (ctx) => {
  const {
    weeklySpend, monthlyEstimate, healthScore, spendingTrend,
    riskScore, spenderType, suggestions, investmentAdvice,
    cashflow, categoryDist, topCategory, dailySpend,
    dailyAvg, totalIncome, totalExpense, netCashflow,
    savingsRate, burnRate, runway, monthlyDisposable,
    categorySorted, categoryTotal, recentTxs, daysTracked,
  } = ctx;

  const categoryLines = categorySorted.slice(0, 10).map(([cat, amt]) => {
    const pct = categoryTotal > 0 ? ((amt / categoryTotal) * 100).toFixed(1) : 0;
    return `  - ${cat}: ${formatCurrency(amt)} (${pct}%)`;
  }).join('\n');

  const recentTxLines = recentTxs.slice(0, 8).map((tx) => {
    const amt = Math.abs(tx.amount);
    const sign = tx.amount < 0 ? 'credit' : 'debit';
    const name = tx.merchant_name || tx.category || 'Unknown';
    return `  - ${sign} ${formatCurrency(amt)} — ${name} (${tx.date})`;
  }).join('\n');

  const dailyLines = Object.entries(dailySpend || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, amt]) => `  - ${date}: ${formatCurrency(amt)}`)
    .join('\n');

  const suggestionLines = (suggestions || []).map((s, i) => {
    const text = typeof s === 'string' ? s : s.text || String(s);
    return `  ${i + 1}. ${text}`;
  }).join('\n');

  return `You are the Unispend Co-pilot, an expert AI financial assistant embedded in the Unispend personal finance app.
You have access to the user's real financial data below. Use this data to give specific, personalized answers.

━━━ USER'S FINANCIAL DATA ━━━

📊 SPENDING OVERVIEW:
- Weekly spend: ${formatCurrency(weeklySpend)}
- Monthly estimate: ${formatCurrency(monthlyEstimate)}
- Daily average: ${formatCurrency(Math.round(dailyAvg))}
- Spending trend: ${spendingTrend}
- Days tracked: ${daysTracked}

🏷️ CATEGORY BREAKDOWN:
${categoryLines || '  No category data available'}

📅 DAILY SPENDING (recent):
${dailyLines || '  No daily data available'}

💰 CASHFLOW:
- Total income: ${formatCurrency(totalIncome)}
- Total expenses: ${formatCurrency(totalExpense)}
- Net cashflow: ${formatCurrency(netCashflow)}
- Savings rate: ${savingsRate ? (savingsRate * 100).toFixed(1) + '%' : 'N/A'}
- Daily burn rate: ${formatCurrency(burnRate)}
- Runway: ${runway ? Math.round(runway) + ' days' : 'N/A'}
- Monthly disposable (spare): ${formatCurrency(Math.max(monthlyDisposable, 0))}

📈 HEALTH & RISK:
- Financial health score: ${healthScore}/100
- Risk score: ${Math.round(riskScore * 100)}%
- Spender type: ${spenderType}
- Top spending category: ${topCategory || 'N/A'}

🧾 RECENT TRANSACTIONS:
${recentTxLines || '  No recent transactions'}

💡 AI SUGGESTIONS:
${suggestionLines || '  No suggestions available'}

📈 INVESTMENT ADVICE:
${investmentAdvice || 'No investment advice available'}

━━━ INSTRUCTIONS ━━━

1. ALWAYS use the actual data above to give specific, numbers-backed answers. Never make up data.
2. Use Indian Rupee (₹) for all amounts. Format large amounts in lakhs/crores when appropriate.
3. Be conversational, warm, and helpful. Use emojis sparingly but effectively.
4. When asked about features the app doesn't have yet, acknowledge it and still provide helpful advice.
5. For investment questions, give educational guidance but remind users that this is not licensed financial advice.
6. For questions about app features (security, UX, account), answer based on the app being a fintech personal finance tracker with bank aggregation via Plaid, AI-powered insights, investment tracking, and cashback rewards.
7. Keep responses concise but informative. Use bullet points and bold text (**bold**) for key numbers.
8. If the user's data is insufficient to answer, say so and suggest what data they should connect.
9. For goal planning, always calculate concrete numbers: monthly savings needed, timeline, gap analysis.
10. Currency: Always use ₹ (Indian Rupee). Use lakh (₹1,00,000) and crore (₹1,00,00,000) for large amounts.
11. The app features: bank connection (Plaid), spending tracking, AI insights, investment tracking (Alpaca), cashback/rewards, savings goals, financial health score.
12. For security questions: The app uses Firebase auth, encrypted data, bank-grade security via Plaid, and does not store bank credentials.`;
};

/**
 * Send a message to Gemini with conversation history + financial context
 */
export const chatWithGemini = async (userMessage, conversationHistory, systemPrompt) => {
  try {
    // Build contents array with conversation history
    const contents = [];

    // Add conversation history (last 10 turns to stay within token limits)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    console.log('[Gemini] sending message...');

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gemini] API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      console.log('[Gemini] response received ✓');
      return text.trim();
    }

    console.warn('[Gemini] empty response');
    return null;
  } catch (err) {
    console.error('[Gemini] error:', err.message);
    return null;
  }
};

export default { buildSystemPrompt, chatWithGemini };
