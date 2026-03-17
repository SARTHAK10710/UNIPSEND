import { useState, useEffect, useCallback } from 'react';
import { plaidAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  groupByDay,
  groupByCategory,
  groupByMerchant,
  filterByMonth,
  calculateMonthComparison,
  detectRecurringSubscriptions,
  normalizeByDay,
} from '../utils/dataTransformers';

const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchTransactions = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;

      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [txnRes, balanceRes] = await Promise.allSettled([
        plaidAPI.getTransactions(forceRefresh),
        plaidAPI.getBalance(),
      ]);

      if (txnRes.status === 'fulfilled') {
        const txns = txnRes.value.data.transactions || [];
        console.log('[useTransactions] loaded:', txns.length, 'transactions');
        setTransactions(txns);
        setLastFetched(new Date());
      } else {
        console.log(
          '[useTransactions] fetch error:',
          txnRes.reason?.message
        );
        setError('Failed to load transactions');
      }

      if (balanceRes.status === 'fulfilled') {
        const accs = balanceRes.value.data.accounts || [];
        setAccounts(accs);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [user]
  );

  const getMonthlyTransactions = useCallback(
    (month) => {
      return filterByMonth(transactions, month);
    },
    [transactions]
  );

  const getSpending = useCallback(
    (month = null) => {
      const txns =
        month !== null ? filterByMonth(transactions, month) : transactions;
      return txns.filter((t) => parseFloat(t.amount) > 0);
    },
    [transactions]
  );

  const getIncome = useCallback(
    (month = null) => {
      const txns =
        month !== null ? filterByMonth(transactions, month) : transactions;
      return txns.filter((t) => parseFloat(t.amount) < 0);
    },
    [transactions]
  );

  const getTotalSpent = useCallback(
    (month = new Date().getMonth()) => {
      return getSpending(month).reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0
      );
    },
    [getSpending]
  );

  const getTotalIncome = useCallback(
    (month = new Date().getMonth()) => {
      return getIncome(month).reduce(
        (sum, t) => sum + Math.abs(parseFloat(t.amount)),
        0
      );
    },
    [getIncome]
  );

  const getTotalBalance = useCallback(() => {
    return accounts.reduce((sum, acc) => sum + (acc.current || 0), 0);
  }, [accounts]);

  const getCategoryBreakdown = useCallback(
    (month = new Date().getMonth()) => {
      return groupByCategory(getSpending(month));
    },
    [getSpending]
  );

  const getDailySpending = useCallback(
    (month = new Date().getMonth()) => {
      return groupByDay(getSpending(month));
    },
    [getSpending]
  );

  const getHeatmapData = useCallback(
    (month = new Date().getMonth()) => {
      return normalizeByDay(getSpending(month));
    },
    [getSpending]
  );

  const getTopMerchants = useCallback(
    (month = new Date().getMonth(), limit = 5) => {
      return groupByMerchant(getSpending(month)).slice(0, limit);
    },
    [getSpending]
  );

  const getMonthComparison = useCallback(() => {
    return calculateMonthComparison(transactions);
  }, [transactions]);

  const getSubscriptions = useCallback(() => {
    return detectRecurringSubscriptions(transactions);
  }, [transactions]);

  const getRecentTransactions = useCallback(
    (limit = 10) => {
      return [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    },
    [transactions]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    accounts,

    isLoading,
    isRefreshing,
    error,
    lastFetched,

    getMonthlyTransactions,
    getSpending,
    getIncome,
    getTotalSpent,
    getTotalIncome,
    getTotalBalance,
    getCategoryBreakdown,
    getDailySpending,
    getHeatmapData,
    getTopMerchants,
    getMonthComparison,
    getSubscriptions,
    getRecentTransactions,

    refresh: () => fetchTransactions(true),
    refetch: fetchTransactions,
  };
};

export default useTransactions;
