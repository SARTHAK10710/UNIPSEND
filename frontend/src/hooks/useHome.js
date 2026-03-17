import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import useTransactions from './useTransactions';
import useAllInsights from './useAllInsights';
import { formatCurrency } from '../utils/formatCurrency';
import { groupByDayOfWeek, mapCategory } from '../utils/dataTransformers';

export const useHome = () => {
  const { user } = useAuth();
  const {
    transactions,
    accounts,
    isLoading: txnLoading,
    isRefreshing,
    getTotalSpent,
    getTotalBalance,
    getRecentTransactions,
    getCategoryBreakdown,
    refresh: refreshTransactions,
  } = useTransactions();

  const {
    getHealthScore,
    getSpenderType,
    getFormattedSuggestions,
    isLoading: insightsLoading,
  } = useAllInsights();

  const userName = user?.displayName || user?.email?.split('@')[0] || '';

  const spent = useMemo(() => getTotalSpent(), [getTotalSpent]);

  const balance = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    const totalCurrent = accounts.reduce((sum, acc) => sum + (acc.current || 0), 0);
    const totalAvailable = accounts.reduce((sum, acc) => sum + (acc.available || 0), 0);
    return { total: totalCurrent, available: totalAvailable, accounts };
  }, [accounts]);

  const formattedTransactions = useMemo(() => {
    return getRecentTransactions(10).map((tx) => {
      const cat = mapCategory(tx.category);
      return {
        name: tx.merchant_name || tx.category || 'Transaction',
        date: new Date(tx.date).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
        }),
        amount: Math.abs(tx.amount),
        icon: cat.icon,
        positive: tx.amount < 0,
      };
    });
  }, [getRecentTransactions]);

  const categories = useMemo(() => {
    return getCategoryBreakdown().slice(0, 5).map((c) => ({
      ...c,
      progress: c.percent,
    }));
  }, [getCategoryBreakdown]);

  const spendingTrend = useMemo(() => {
    const now = new Date();
    const thisMonthTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return groupByDayOfWeek(thisMonthTxs);
  }, [transactions]);

  const insights = useMemo(() => getFormattedSuggestions(), [getFormattedSuggestions]);

  const kpis = useMemo(() => {
    if (!balance) return [];
    const totalBalance = balance.total || 0;
    const savedAmount = totalBalance - spent;

    return [
      {
        title: 'Spent',
        value: formatCurrency(spent),
        gradient: ['#7c6aff', '#9b8aff'],
        subValue: 'This month',
        subColor: '#ff6b6b',
      },
      {
        title: 'Saved',
        value: formatCurrency(savedAmount > 0 ? savedAmount : 0),
        gradient: ['#4effd6', '#2cb5a0'],
        subValue: savedAmount > 0 ? 'On track' : 'Overspent',
        subColor: savedAmount > 0 ? '#4effd6' : '#ff6b6b',
      },
      {
        title: 'Balance',
        value: formatCurrency(totalBalance),
        gradient: ['#ffd166', '#e6b84d'],
        subValue: `${(balance.accounts || []).length} accounts`,
        subColor: '#ffd166',
      },
      {
        title: 'Available',
        value: formatCurrency(balance.available || 0),
        gradient: ['#ff6b6b', '#ff8e8e'],
        subValue: 'To spend',
        subColor: '#4effd6',
      },
    ];
  }, [balance, spent]);

  const isLoading = txnLoading && insightsLoading;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  }, [refreshTransactions]);

  return {
    userName,
    balance,
    kpis,
    spendingTrend,
    categories,
    transactions: formattedTransactions,
    insights,
    loading: isLoading,
    refreshing,
    onRefresh,
    error: null,
    refresh: refreshTransactions,
  };
};
