import { useState, useEffect, useCallback } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useTransactions from './useTransactions';

const useAllInsights = () => {
  const { user } = useAuth();
  const { transactions, isLoading: txnLoading } = useTransactions();

  const [insights, setInsights] = useState(null);
  const [portfolioRec, setPortfolioRec] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  const fetchInsights = useCallback(async () => {
    if (!user || transactions.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        '[useAllInsights] analyzing',
        transactions.length,
        'transactions...'
      );

      const response = await aiAPI.getInsights();
      const aiData = response.data;

      console.log('[useAllInsights] AI response:', {
        health_score: aiData.financial_health_score,
        spender_type: aiData.spender_type,
        trend: aiData.spending_trend,
        suggestions: aiData.suggestions?.length,
      });

      setInsights(aiData);
      setLastAnalyzed(new Date());

      if (aiData.portfolio) {
        setPortfolioRec(aiData.portfolio);
      }
    } catch (err) {
      console.error('[useAllInsights] error:', err.message);
      setError('AI insights unavailable');
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, transactions]);

  useEffect(() => {
    if (!txnLoading && transactions.length > 0) {
      fetchInsights();
    } else if (!txnLoading && transactions.length === 0) {
      setIsLoading(false);
    }
  }, [txnLoading, transactions.length]);

  const getHealthScore = () => insights?.financial_health_score || 0;

  const getSpenderType = () => insights?.spender_type || 'moderate';

  const getSpendingTrend = () => insights?.spending_trend || 'stable';

  const getRiskScore = () => insights?.risk_score || 0.5;

  const getSuggestions = () => insights?.suggestions || [];

  const getInvestmentAdvice = () =>
    insights?.investment_advice || 'Connect your bank for personalized advice';

  const getWeeklySpend = () => insights?.weekly_spend || 0;

  const getMonthlyEstimate = () => insights?.monthly_estimate || 0;

  const getCategoryDistribution = () =>
    insights?.category_distribution || {};

  const getDailySpendMap = () => insights?.daily_spend || {};

  const getFormattedSuggestions = () => {
    const suggestions = getSuggestions();
    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    return suggestions.map((s, index) => ({
      id: `suggestion_${index}`,
      type: 'suggestion',
      emoji: getSuggestionEmoji(s),
      title: getSuggestionTitle(s),
      description: typeof s === 'string' ? s : s.message || s.description || s,
      savingAmount: s.saving || null,
    }));
  };

  const getSuggestionEmoji = (suggestion) => {
    const text =
      typeof suggestion === 'string'
        ? suggestion.toLowerCase()
        : (suggestion.message || '').toLowerCase();

    if (text.includes('food') || text.includes('restaurant')) return '🍕';
    if (text.includes('coffee')) return '☕';
    if (text.includes('transport') || text.includes('uber')) return '🚇';
    if (text.includes('subscription') || text.includes('netflix')) return '📱';
    if (text.includes('shopping')) return '🛍️';
    if (text.includes('invest')) return '📈';
    return '💡';
  };

  const getSuggestionTitle = (suggestion) => {
    const text =
      typeof suggestion === 'string'
        ? suggestion.toLowerCase()
        : (suggestion.message || '').toLowerCase();

    if (text.includes('food')) return 'Food spending';
    if (text.includes('transport')) return 'Transport';
    if (text.includes('subscription')) return 'Subscriptions';
    if (text.includes('shopping')) return 'Shopping';
    if (text.includes('invest')) return 'Investment tip';
    return 'Saving tip';
  };

  return {
    insights,
    portfolioRec,

    isLoading: isLoading || txnLoading,
    error,
    lastAnalyzed,

    getHealthScore,
    getSpenderType,
    getSpendingTrend,
    getRiskScore,
    getSuggestions,
    getInvestmentAdvice,
    getWeeklySpend,
    getMonthlyEstimate,
    getCategoryDistribution,
    getDailySpendMap,
    getFormattedSuggestions,

    refresh: fetchInsights,
  };
};

export default useAllInsights;
