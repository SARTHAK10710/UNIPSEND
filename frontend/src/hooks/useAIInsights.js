import { useState, useEffect, useCallback, useRef } from 'react';
import { aiService, getEmptyAIResponse } from '../services/aiService';
import { plaidAPI } from '../services/api';
import { useSharedAIInsights } from '../context/AIInsightsContext';

// ─────────────────────────────────────────────────────────────
// useAIInsightsInternal
//
// Core hook that fetches Plaid data, sends it to the
// Unispend AI API, and exposes clean getter functions.
// This is used ONLY by <AIInsightsProvider>. All screens
// should use useAIInsights() which reads the shared context.
// ─────────────────────────────────────────────────────────────

export const useAIInsightsInternal = () => {
  // ── State ─────────────────────────────────────────────────
  const [insights, setInsights] = useState(getEmptyAIResponse());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Guard against duplicate in-flight requests
  const isFetching = useRef(false);

  // ── Core fetch function ───────────────────────────────────
  const fetchInsights = useCallback(async () => {
    // Prevent concurrent calls
    if (isFetching.current) {
      console.log('[useAIInsights] fetch already in progress — skipping');
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // ─ 1. Health check ──────────────────────────────────
      console.log('[useAIInsights] checking AI health...');
      const health = await aiService.checkHealth();

      if (health.status !== 'ok') {
        console.log('[useAIInsights] AI service offline — using fallback');
        setApiAvailable(false);
        setInsights(getEmptyAIResponse());
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      setApiAvailable(true);

      // ─ 2. Fetch Plaid data in parallel ──────────────────
      console.log('[useAIInsights] fetching Plaid data...');
      const [txRes, balRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        plaidAPI.getBalance(),
      ]);

      // Extract transactions
      const transactions =
        txRes.status === 'fulfilled'
          ? txRes.value?.data?.transactions || []
          : [];

      // Extract balance
      let currentBalance = null;
      if (balRes.status === 'fulfilled') {
        const accounts = balRes.value?.data?.accounts || [];
        currentBalance = accounts.reduce(
          (sum, acc) => sum + (acc.current || 0),
          0,
        );
      }

      console.log(
        `[useAIInsights] plaid data: ${transactions.length} txs, balance: ${currentBalance}`,
      );

      // ─ 3. Bail out if no transactions ───────────────────
      if (transactions.length === 0) {
        console.log('[useAIInsights] no transactions — using fallback');
        setInsights(getEmptyAIResponse());
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      // ─ 4. Call AI service ───────────────────────────────
      const result = await aiService.analyzeTransactions(
        transactions,
        currentBalance,
      );

      console.log('[useAIInsights] insights received ✓ (health:', result?.financial_health_score, ')');

      // ─ 5. Update state ──────────────────────────────────
      setInsights(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[useAIInsights] error:', err.message);
      setError('AI insights unavailable');
      setApiAvailable(false);
      setInsights(getEmptyAIResponse());
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  // ── Fetch on mount ────────────────────────────────────────
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ─────────────────────────────────────────────────────────
  // Getters — core fields (always return safe values)
  // ─────────────────────────────────────────────────────────

  const getHealthScore = useCallback(
    () => insights.financial_health_score ?? 50,
    [insights],
  );

  const getWeeklySpend = useCallback(
    () => insights.weekly_spend ?? 0,
    [insights],
  );

  const getMonthlyEstimate = useCallback(
    () => insights.monthly_estimate ?? 0,
    [insights],
  );

  const getSpendingTrend = useCallback(
    () => insights.spending_trend ?? 'stable',
    [insights],
  );

  const getRiskScore = useCallback(
    () => insights.risk_score ?? 0.5,
    [insights],
  );

  const getRiskScorePercent = useCallback(
    () => Math.round((insights.risk_score ?? 0.5) * 100),
    [insights],
  );

  const getSpenderType = useCallback(
    () => insights.spender_type ?? 'moderate',
    [insights],
  );

  const getSuggestions = useCallback(
    () => insights.suggestions ?? [],
    [insights],
  );

  const getInvestmentAdvice = useCallback(
    () =>
      insights.investment_advice ??
      'Connect your bank to get personalized insights',
    [insights],
  );

  // ─────────────────────────────────────────────────────────
  // Getters — conditional fields (may return null)
  // ─────────────────────────────────────────────────────────

  const getCashflow = useCallback(
    () => insights.cashflow ?? null,
    [insights],
  );

  const getSpendingHeatmap = useCallback(
    () => insights.spending_heatmap ?? null,
    [insights],
  );

  const getTopSpendingCategory = useCallback(
    () => insights.top_spending_category ?? null,
    [insights],
  );

  const getCategoryDistribution = useCallback(
    () => insights.category_distribution ?? null,
    [insights],
  );

  // ─────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────

  return {
    // Raw state
    insights,
    isLoading,
    error,
    apiAvailable,
    lastUpdated,

    // Core getters
    getHealthScore,
    getWeeklySpend,
    getMonthlyEstimate,
    getSpendingTrend,
    getRiskScore,
    getRiskScorePercent,
    getSpenderType,
    getSuggestions,
    getInvestmentAdvice,

    // Conditional getters
    getCashflow,
    getSpendingHeatmap,
    getTopSpendingCategory,
    getCategoryDistribution,

    // Actions
    refresh: fetchInsights,
  };
};

// ─────────────────────────────────────────────────────────────
// Public hook — reads from the shared Context
// Every screen should use this (not useAIInsightsInternal).
// ─────────────────────────────────────────────────────────────
export const useAIInsights = () => useSharedAIInsights();

export default useAIInsights;
