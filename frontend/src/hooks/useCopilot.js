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

// ── Price parser for natural language ────────────────────────
const parsePrice = (text) => {
  const t = text.toLowerCase().replace(/,/g, '');

  // "1 crore", "1.5cr", "50 lakh", "2.5L"
  const crMatch = t.match(/([\d.]+)\s*(?:crore|cr)\b/);
  if (crMatch) return parseFloat(crMatch[1]) * 10000000;
  const lakhMatch = t.match(/([\d.]+)\s*(?:lakh|lac|l)\b/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  // "₹50000", "Rs 50000", "50k", "50000"
  const kMatch = t.match(/([\d.]+)\s*k\b/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const numMatch = t.match(/(?:₹|rs\.?\s*|inr\s*)([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]);

  // Known items with typical prices
  const knownPrices = {
    'iphone': 80000, 'iphone 15': 80000, 'iphone 16': 110000, 'iphone 17': 130000,
    'macbook': 150000, 'mac': 150000, 'laptop': 70000, 'ps5': 50000,
    'car': 800000, 'bike': 120000, 'scooter': 80000,
    'ipad': 45000, 'airpods': 15000, 'watch': 35000, 'apple watch': 45000,
  };

  for (const [item, price] of Object.entries(knownPrices)) {
    if (t.includes(item)) return price;
  }

  // Bare number > 100 (likely a price)
  const bareNum = t.match(/\b(\d{3,})\b/);
  if (bareNum) return parseFloat(bareNum[1]);

  return null;
};

// ── Extract what the user wants to buy ──────────────────────
const parseItem = (text) => {
  const match = text.match(/(?:afford|buy|purchase|get)\s+(?:a|an|the)?\s*(.+?)(?:\?|$|next|this|in\s+\d)/i);
  if (match) return match[1].trim().replace(/\s+/g, ' ');

  const match2 = text.match(/(?:can i|will i|could i)\s+.*?(?:afford|buy|get)\s+(?:a|an|the)?\s*(.+?)(?:\?|$)/i);
  if (match2) return match2[1].trim().replace(/\s+/g, ' ');

  return 'that item';
};

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

  // ── Affordability Calculator (UPGRADED) ─────────────────
  if (/afford|buy|purchase|can i get/i.test(q)) {
    const price = parsePrice(q);
    const item = parseItem(query);
    const spare = Math.max(ctx.monthlyDisposable, 0);

    if (!price) {
      return `💰 Your monthly spare capacity is ~**${formatCurrency(spare)}**\n\n• Monthly spending: ${formatCurrency(ctx.monthlyEstimate)}\n• Health score: ${ctx.healthScore}/100\n\nTell me the item and price (e.g. "Can I afford an iPhone 17 for ₹1,30,000?") and I'll calculate!`;
    }

    const monthsNeeded = spare > 0 ? Math.ceil(price / spare) : null;
    const canAffordNow = spare >= price;
    const weeksNeeded = spare > 0 ? Math.ceil(price / (spare / 4.33)) : null;

    if (canAffordNow) {
      return `✅ **Yes, you can afford ${item}!**\n\n💰 Price: **${formatCurrency(price)}**\n💸 Your monthly spare: **${formatCurrency(spare)}**\n\nYou have enough spare capacity this month! After buying, you'd still have ~**${formatCurrency(spare - price)}** left.\n\n💡 **Tip**: Your health score is **${ctx.healthScore}/100** — ${ctx.healthScore >= 70 ? 'looking good, go for it!' : 'consider if this is essential since your health score could be better.'}`;
    }

    if (monthsNeeded && monthsNeeded <= 24) {
      const savingsPerMonth = Math.ceil(price / monthsNeeded);
      return `🤔 **${item} costs ${formatCurrency(price)}** — here's the plan:\n\n💸 Your monthly spare: **${formatCurrency(spare)}**\n⏰ Time to save: **${monthsNeeded} month${monthsNeeded > 1 ? 's' : ''}** (~${weeksNeeded} weeks)\n💰 Save per month: **${formatCurrency(savingsPerMonth)}**\n\n📋 **Action plan**:\n1. Set aside **${formatCurrency(savingsPerMonth)}/month** starting now\n2. Cut **${ctx.categorySorted?.[0]?.[0] || 'top category'}** spending by ~${formatCurrency(Math.min(savingsPerMonth, ctx.categorySorted?.[0]?.[1] || 0))}\n3. Target date: **${new Date(Date.now() + monthsNeeded * 30 * 86400000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}**\n\n${ctx.healthScore >= 60 ? '💚 Your finances are healthy enough to plan this!' : '⚠️ Consider improving your health score (currently ' + ctx.healthScore + '/100) before big purchases.'}`;
    }

    return `⚠️ **${item} at ${formatCurrency(price)} is a stretch right now.**\n\n💸 Monthly spare: **${formatCurrency(spare)}**\n⏰ Would take: **${monthsNeeded ? monthsNeeded + '+ months' : 'a very long time'}**\n\n💡 Consider:\n• Increasing income or reducing spending first\n• Looking for EMI/loan options\n• Setting a smaller savings goal first`;
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

  // Investment
  if (/invest|sip|mutual fund|stock/i.test(q)) {
    const spare = Math.max(ctx.monthlyDisposable, 0);
    const sipAmount = Math.round(spare * 0.3 / 500) * 500 || 500;
    return `📈 Investment snapshot:\n\n• Monthly spare: **${formatCurrency(spare)}**\n• Suggested SIP: **${formatCurrency(sipAmount)}/month** (30% of spare)\n• Risk profile: **${Math.round(ctx.riskScore * 100)}%**\n• Spender type: **${ctx.spenderType}**\n\n💡 With **${formatCurrency(sipAmount)}/month** in a diversified index fund (~12% annual return):\n• 1 year: ~**${formatCurrency(Math.round(sipAmount * 12.7))}**\n• 3 years: ~**${formatCurrency(Math.round(sipAmount * 43.1))}**\n• 5 years: ~**${formatCurrency(Math.round(sipAmount * 81.7))}**`;
  }

  // Budget / plan
  if (/budget|plan|reduce|cut/i.test(q)) {
    const topCat = ctx.categorySorted?.[0];
    const spare = Math.max(ctx.monthlyDisposable, 0);
    return `📋 Budget suggestion:\n\n• Monthly income: **${formatCurrency(ctx.totalIncome || ctx.monthlyEstimate * 1.2)}**\n• Monthly spending: **${formatCurrency(ctx.monthlyEstimate)}**\n• Spare: **${formatCurrency(spare)}**\n${topCat ? `\n🎯 **Top saving opportunity**: Cut **${topCat[0]}** (${formatCurrency(topCat[1])}) by 20% → save **${formatCurrency(Math.round(topCat[1] * 0.2))}/month** extra` : ''}`;
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
