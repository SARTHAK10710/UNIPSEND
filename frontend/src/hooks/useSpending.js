import { useState, useCallback, useEffect, useMemo } from 'react';
import useTransactions from './useTransactions';
import useAllInsights from './useAllInsights';
import {
  groupByDayOfWeek,
  groupByMerchant,
  normalizeByDay,
  filterByMonth,
  calculateMonthComparison,
} from '../utils/dataTransformers';

export const useSpending = () => {
  const {
    transactions,
    isLoading: txnLoading,
    getCategoryBreakdown,
    refresh: refreshTransactions,
  } = useTransactions();

  const {
    getFormattedSuggestions,
    isLoading: insightsLoading,
  } = useAllInsights();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const filtered = useMemo(
    () => filterByMonth(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(selectedMonth),
    [getCategoryBreakdown, selectedMonth]
  );

  const dailyData = useMemo(
    () => groupByDayOfWeek(filtered),
    [filtered]
  );

  const topMerchants = useMemo(
    () => groupByMerchant(filtered),
    [filtered]
  );

  const heatmapData = useMemo(
    () => normalizeByDay(filtered),
    [filtered]
  );

  const monthComparison = useMemo(
    () => calculateMonthComparison(transactions),
    [transactions]
  );

  const suggestions = useMemo(
    () => getFormattedSuggestions(),
    [getFormattedSuggestions]
  );

  const totalSpent = useMemo(
    () => categoryBreakdown.reduce((sum, c) => sum + c.amount, 0),
    [categoryBreakdown]
  );

  const isLoading = txnLoading;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  }, [refreshTransactions]);

  return {
    selectedMonth,
    setSelectedMonth,
    totalSpent,
    dailyData,
    categoryBreakdown,
    topMerchants,
    suggestions,
    heatmapData,
    monthComparison,
    loading: isLoading,
    refreshing,
    onRefresh,
    error: null,
    refresh: refreshTransactions,
  };
};
