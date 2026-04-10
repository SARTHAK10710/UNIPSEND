import { useState, useCallback, useRef, useMemo } from 'react';
import { useAIInsights } from './useAIInsights';
import { plaidAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { buildSystemPrompt, chatWithGemini } from '../services/geminiService';

// ─────────────────────────────────────────────────────────────
// useCopilot
//
// AI financial co-pilot powered by Google Gemini 2.0 Flash.
// Uses real financial data as context so Gemini can answer
// ANY financial question with personalized, data-backed answers.
// Falls back to local intent engine if Gemini is unavailable.
// ─────────────────────────────────────────────────────────────

const GREETING_MESSAGE = {
  id: 'greeting',
  role: 'assistant',
  text: "Hey! I'm your Unispend Co-pilot 🤖\n\nI'm powered by AI and I have access to your real financial data. Ask me **anything** about your money — I can handle it all:\n\n• \"Can I afford an iPhone 17 next month?\"\n• \"How much do I need to save for a 1Cr flat?\"\n• \"Where is my money going?\"\n• \"Am I saving enough for my age?\"\n• \"Explain SIPs to me\"\n• \"What tax deductions can I claim?\"\n\nGo ahead, ask away! 💬",
  timestamp: new Date(),
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Financial Context Builder
// ─────────────────────────────────────────────────────────────

const buildFinancialContext = (ai, txs) => {
  const insights = ai.insights || {};
  const weeklySpend = ai.getWeeklySpend() || 0;
  const monthlyEstimate = ai.getMonthlyEstimate() || 0;
  const healthScore = ai.getHealthScore() || 50;
  const spendingTrend = ai.getSpendingTrend() || 'stable';
  const riskScore = ai.getRiskScore() || 0.5;
  const spenderType = ai.getSpenderType() || 'moderate';
  const suggestions = ai.getSuggestions() || [];
  const investmentAdvice = ai.getInvestmentAdvice() || '';
  const cashflow = ai.getCashflow();
  const categoryDist = ai.getCategoryDistribution() || {};
  const topCategory = ai.getTopSpendingCategory();
  const dailySpend = insights.daily_spend || {};

  const dailyEntries = Object.entries(dailySpend);
  const totalTracked = dailyEntries.reduce((s, [, v]) => s + v, 0);
  const daysTracked = dailyEntries.length || 1;
  const dailyAvg = totalTracked / daysTracked;

  const totalIncome = cashflow?.total_income || 0;
  const totalExpense = cashflow?.total_expense || 0;
  const netCashflow = cashflow?.net_cashflow || 0;
  const savingsRate = cashflow?.savings_rate || 0;
  const burnRate = cashflow?.daily_burn_rate || dailyAvg;
  const runway = cashflow?.days_of_runway || null;
  const monthlyDisposable = totalIncome > 0
    ? totalIncome - totalExpense
    : monthlyEstimate > 0 ? monthlyEstimate * 0.2 : 0;

  const categorySorted = Object.entries(categoryDist).sort(([, a], [, b]) => b - a);
  const categoryTotal = categorySorted.reduce((s, [, v]) => s + v, 0);
  const recentTxs = (txs || []).slice(0, 10);

  return {
    weeklySpend, monthlyEstimate, healthScore, spendingTrend,
    riskScore, spenderType, suggestions, investmentAdvice,
    cashflow, categoryDist, topCategory, dailySpend,
    dailyAvg, totalIncome, totalExpense, netCashflow,
    savingsRate, burnRate, runway, monthlyDisposable,
    categorySorted, categoryTotal, recentTxs, daysTracked,
  };
};

// ─────────────────────────────────────────────────────────────
// Local Fallback (simplified — used if Gemini is down)
// ─────────────────────────────────────────────────────────────

const buildLocalFallback = (query, ctx) => {
  const q = query.toLowerCase();

  // Spending
  if (/how much.*(spend|spent)|total.*spend/i.test(q)) {
    return `📊 Here's your spending overview:\n\n• **Weekly**: ${formatCurrency(ctx.weeklySpend)}\n• **Monthly estimate**: ${formatCurrency(ctx.monthlyEstimate)}\n• **Daily average**: ${formatCurrency(Math.round(ctx.dailyAvg))}\n• **Trend**: ${ctx.spendingTrend}`;
  }

  // Categories
  if (/categor|where.*money|most.*spend/i.test(q)) {
    const lines = ctx.categorySorted.slice(0, 5).map(([cat, amt], i) => {
      const pct = ctx.categoryTotal > 0 ? ((amt / ctx.categoryTotal) * 100).toFixed(1) : 0;
      return `${i + 1}. **${cat}**: ${formatCurrency(amt)} (${pct}%)`;
    });
    return `🏷️ Spending by category:\n\n${lines.join('\n')}`;
  }

  // Health
  if (/health|score/i.test(q)) {
    return `💚 Financial health score: **${ctx.healthScore}/100**\n\n• Spender type: **${ctx.spenderType}**\n• Risk: **${Math.round(ctx.riskScore * 100)}%**\n• Trend: **${ctx.spendingTrend}**`;
  }

  // Afford / buy
  if (/afford|buy|purchase/i.test(q)) {
    const spare = Math.max(ctx.monthlyDisposable, 0);
    return `💰 Your monthly spare capacity is ~**${formatCurrency(spare)}**\n\n• Monthly spending: ${formatCurrency(ctx.monthlyEstimate)}\n• Health score: ${ctx.healthScore}/100\n\nTell me the price and I'll calculate if you can afford it!`;
  }

  // Savings
  if (/sav(e|ing)|save/i.test(q)) {
    const spare = Math.max(ctx.monthlyDisposable, 0);
    return `💰 Savings overview:\n\n• Monthly spare: ~**${formatCurrency(spare)}**\n• Savings rate: **${ctx.savingsRate ? (ctx.savingsRate * 100).toFixed(1) + '%' : 'N/A'}**\n• Health score: **${ctx.healthScore}/100**`;
  }

  // Transactions
  if (/recent|transaction|last/i.test(q) && ctx.recentTxs.length > 0) {
    const lines = ctx.recentTxs.slice(0, 5).map((tx) => {
      const amt = Math.abs(tx.amount);
      const name = tx.merchant_name || tx.category || 'Transaction';
      return `• ${formatCurrency(amt)} — ${name} (${tx.date})`;
    });
    return `🧾 Recent transactions:\n\n${lines.join('\n')}`;
  }

  // Greetings
  if (/hello|hi|hey/i.test(q)) {
    return "Hey there! 👋 Ask me anything about your finances!";
  }

  // Generic fallback
  const topCats = ctx.categorySorted.slice(0, 3).map(([c, a]) => `**${c}** (${formatCurrency(a)})`).join(', ');
  return `Here's your financial snapshot:\n\n💰 **Spending**: ${formatCurrency(ctx.monthlyEstimate)}/month (${ctx.spendingTrend})\n🏷️ **Top categories**: ${topCats || 'N/A'}\n💚 **Health**: ${ctx.healthScore}/100\n📊 **Type**: ${ctx.spenderType} spender\n💸 **Spare**: ~${formatCurrency(Math.max(ctx.monthlyDisposable, 0))}/month\n\nAsk me anything specific!`;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useCopilot = () => {
  const ai = useAIInsights();
  const [messages, setMessages] = useState([GREETING_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const hasFetchedTxRef = useRef(false);

  const ensureTransactions = useCallback(async () => {
    if (hasFetchedTxRef.current && transactions.length > 0) return transactions;
    try {
      const res = await plaidAPI.getTransactions();
      const txs = res.data?.transactions || [];
      setTransactions(txs);
      hasFetchedTxRef.current = true;
      return txs;
    } catch {
      return transactions;
    }
  }, [transactions]);

  // ── Send Message ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim()) return;

      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);

      try {
        // 1. Gather financial context
        const txs = await ensureTransactions();
        const ctx = buildFinancialContext(ai, txs);
        const systemPrompt = buildSystemPrompt(ctx);

        // 2. Build conversation history for Gemini (exclude greeting)
        const history = messages
          .filter((m) => m.id !== 'greeting')
          .map((m) => ({ role: m.role, text: m.text }));

        // 3. Try Gemini first
        let response = await chatWithGemini(text.trim(), history, systemPrompt);

        // 4. Fall back to local engine if Gemini fails
        if (!response) {
          console.log('[Copilot] Gemini unavailable, using local fallback');
          response = buildLocalFallback(text.trim(), ctx);
        }

        const assistantMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error('[Copilot] error:', err.message);
        const errorMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: "Sorry, I ran into an issue processing your question. Please try again! 🔄",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [ai, messages, ensureTransactions],
  );

  // ── Quick Actions ───────────────────────────────────────────
  const quickActions = [
    { label: '📱 Afford?', query: 'Can I afford an iPhone 17 next month?' },
    { label: '💰 Spending', query: 'Where is my money going this month?' },
    { label: '💡 Save', query: 'How can I save more money?' },
    { label: '📈 Invest', query: 'Where should I invest my savings?' },
    { label: '📋 Summary', query: 'Give me a complete financial report' },
    { label: '🎯 Goals', query: 'Help me plan my financial goals' },
  ];

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
    quickActions,
    aiLoading: ai.isLoading,
    aiAvailable: ai.apiAvailable,
  };
};

export default useCopilot;
