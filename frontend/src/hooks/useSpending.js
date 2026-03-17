import { useState, useCallback, useEffect } from 'react';
import { plaidAPI } from '../services/api';
import {
  groupByCategory,
  groupByRecentDays,
  groupByMerchant,
  normalizeByDay,
  filterByMonth,
  calculateMonthComparison,
} from '../utils/dataTransformers';

export const useSpending = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [allTransactions, setAllTransactions] = useState([]);

  const [dailyData, setDailyData] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [topMerchants, setTopMerchants] = useState([]);
  const [heatmapData, setHeatmapData] = useState(new Array(28).fill(0));
  const [monthComparison, setMonthComparison] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  const processTransactions = useCallback((txs, month) => {
    const filtered = filterByMonth(txs, month);
    console.log('[useSpending] processing month', month, '→', filtered.length, 'transactions');

    setCategoryBreakdown(groupByCategory(filtered));
    
    // Determine base date for trend (last day of the selected month or today)
    const now = new Date();
    let baseDate = now;
    if (month !== now.getMonth()) {
      baseDate = new Date(now.getFullYear(), month + 1, 0); 
    }

    setDailyData(groupByRecentDays(filtered, 7, baseDate));
    setTopMerchants(groupByMerchant(filtered));
    setHeatmapData(normalizeByDay(filtered));
    setMonthComparison(calculateMonthComparison(txs));

    // AI suggestions not ready yet
    setSuggestions([]);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[useSpending] fetching transactions...');
      const res = await plaidAPI.getTransactions();
      const txs = res.data?.transactions || [];
      setAllTransactions(txs);
      console.log('[useSpending] data loaded:', txs.length, 'transactions');

      processTransactions(txs, selectedMonth);
    } catch (err) {
      console.error('[useSpending] fetchData error:', err.message);
      setError(err.response?.data?.message || 'Failed to load spending data');
      setAllTransactions([]);
      setCategoryBreakdown([]);
      setDailyData([]);
      setTopMerchants([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, processTransactions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (allTransactions.length > 0) {
      processTransactions(allTransactions, selectedMonth);
    }
  }, [selectedMonth, allTransactions, processTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

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
    error,
    refresh: fetchData,
  };
};
