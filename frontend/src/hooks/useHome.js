import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { plaidAPI, aiAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { groupByCategory, groupByRecentDays, mapCategory, transformToAIFormat } from '../utils/dataTransformers';

export const useHome = () => {
  const { user } = useAuth();

  const [balance, setBalance] = useState(null);
  const [spent, setSpent] = useState(0);
  const [saved, setSaved] = useState(0);
  const [kpis, setKpis] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);

  const [balanceLoading, setBalanceLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userName = user?.displayName || user?.email?.split('@')[0] || '';

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      console.log('[useHome] fetching balance...');
      const res = await plaidAPI.getBalance();
      const accounts = res.data?.accounts || [];
      const totalCurrent = accounts.reduce((sum, acc) => sum + (acc.current || 0), 0);
      const totalAvailable = accounts.reduce((sum, acc) => sum + (acc.available || 0), 0);
      setBalance({ total: totalCurrent, available: totalAvailable, accounts });
      console.log('[useHome] balance loaded:', { totalCurrent, totalAvailable });
    } catch (err) {
      console.error('[useHome] fetchBalance error:', err.message);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      console.log('[useHome] fetching transactions...');
      const res = await plaidAPI.getTransactions();
      const txs = res.data?.transactions || [];
      console.log('[useHome] transactions loaded:', txs.length);

      const formatted = txs.slice(0, 10).map((tx) => {
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
      setTransactions(formatted);

      const now = new Date();
      const thisMonthTxs = txs.filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalSpent = thisMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
      setSpent(totalSpent);

      const cats = groupByCategory(thisMonthTxs);
      setCategories(cats.slice(0, 5).map((c) => ({
        ...c,
        progress: c.percent,
      })));

      const daily = groupByRecentDays(txs);
      setSpendingTrend(daily);

      return { totalSpent, txs };
    } catch (err) {
      console.error('[useHome] fetchTransactions error:', err.message);
      setTransactions([]);
      setCategories([]);
      setSpendingTrend([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [balResult, txResult] = await Promise.allSettled([
        fetchBalance(),
        fetchTransactions(),
      ]);

      // Call AI API if calculations succeeded
      if (txResult.status === 'fulfilled' && txResult.value) {
        try {
          const { txs } = txResult.value;
          const currentBal = (balResult.status === 'fulfilled' && balance) ? balance.total : 0;
          const aiData = transformToAIFormat(txs, currentBal);
          
          console.log('[useHome] requesting AI analysis...');
          const aiRes = await aiAPI.analyze(aiData);
          if (aiRes.data) {
            setHealthScore(aiRes.data.financial_health_score);
            setInsights(aiRes.data.suggestions || []);
          }
        } catch (aiErr) {
          console.warn('[useHome] AI analysis failed:', aiErr.message);
          // Fallback handled by initial state
        }
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('[useHome] fetchAll error:', err.message);
    }
  }, [fetchBalance, fetchTransactions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (balance && spent >= 0) {
      const totalBalance = balance.total || 0;
      const savedAmount = totalBalance - spent;
      setSaved(savedAmount > 0 ? savedAmount : 0);

      setKpis([
        {
          title: 'Health Score',
          value: healthScore ? `${Math.round(healthScore)}/100` : 'Analyze',
          gradient: healthScore > 70 ? ['#4effd6', '#2cb5a0'] : ['#ffd166', '#e6b84d'],
          subValue: healthScore > 70 ? 'Excellent' : 'Needs attention',
          subColor: healthScore > 70 ? '#4effd6' : '#ffd166',
        },
        {
          title: 'Spent',
          value: formatCurrency(spent),
          gradient: ['#7c6aff', '#9b8aff'],
          subValue: 'This month',
          subColor: '#ff6b6b',
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
      ]);
    }
  }, [balance, spent]);

  const isLoading = balanceLoading && transactionsLoading;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  return {
    userName,
    balance,
    kpis,
    spendingTrend,
    categories,
    transactions,
    insights,
    loading: isLoading,
    refreshing,
    onRefresh,
    error,
    refresh: fetchAll,
  };
};
