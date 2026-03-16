import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { plaidAPI, aiAPI } from '../services/api';

const MOCK_KPIS = [
  { title: 'Spent', value: '₹4,500', gradient: ['#7c6aff', '#9b8aff'], subValue: '+12% this month', subColor: '#ff6b6b' },
  { title: 'Saved', value: '₹12,000', gradient: ['#4effd6', '#2cb5a0'], subValue: 'On track', subColor: '#4effd6' },
  { title: 'Emergency', value: '₹3,000', gradient: ['#ffd166', '#e6b84d'], subValue: '60% of goal', subColor: '#ffd166' },
  { title: 'Invested', value: '₹1,520', gradient: ['#ff6b6b', '#ff8e8e'], subValue: '+4.2% return', subColor: '#4effd6' },
];

const MOCK_SPENDING = [
  { amount: 45, isHighlight: false },
  { amount: 62, isHighlight: false },
  { amount: 38, isHighlight: false },
  { amount: 71, isHighlight: false },
  { amount: 84, isHighlight: true },
  { amount: 56, isHighlight: false },
  { amount: 33, isHighlight: false },
];

const MOCK_CATEGORIES = [
  { name: 'Food & Dining', amount: '1,850', icon: '🍽️', color: '#7c6aff', progress: 80 },
  { name: 'Shopping', amount: '1,200', icon: '🛍️', color: '#4effd6', progress: 60 },
  { name: 'Transport', amount: '950', icon: '🚗', color: '#ffd166', progress: 45 },
];

const MOCK_TRANSACTIONS = [
  { name: 'Blue Tokai Coffee', date: '24 Oct, 10:30 AM', amount: '280', icon: '☕', positive: false },
  { name: 'Salary Credit', date: '23 Oct, 10:00 AM', amount: '45,000', icon: '💼', positive: true },
  { name: 'Amazon India', date: '22 Oct, 08:15 PM', amount: '1,499', icon: '📦', positive: false },
  { name: 'Swiggy', date: '22 Oct, 01:30 PM', amount: '450', icon: '🍕', positive: false },
];

const MOCK_INSIGHTS = [
  {
    title: 'Saving Tip',
    message: 'You spent 15% more on dining than last month. Setting a ₹1,500 limit could save you ₹350.',
    icon: '💡',
  },
  {
    title: 'Investment Alert',
    message: 'NIFTY 50 is up 2.3% this week. Consider investing your surplus savings.',
    icon: '📈',
  },
];

const CATEGORY_ICONS = {
  'Food & Dining': '🍽️', 'Shopping': '🛍️', 'Transport': '🚗',
  'Entertainment': '🎬', 'Bills': '📱', 'Other': '📋',
  'FOOD_AND_DRINK': '🍽️', 'SHOPPING': '🛍️', 'TRANSPORTATION': '🚗',
  'ENTERTAINMENT': '🎬', 'GENERAL_MERCHANDISE': '🛒',
};

export const useHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ total: '21,020' });
  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [spendingTrend, setSpendingTrend] = useState(MOCK_SPENDING);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [insights, setInsights] = useState(MOCK_INSIGHTS);

  const userName = user?.displayName || 'Sarthak';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, balRes, aiRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        plaidAPI.getBalance(),
        aiAPI.getInsights(),
      ]);

      if (balRes.status === 'fulfilled' && balRes.value?.data?.accounts) {
        const accounts = balRes.value.data.accounts;
        const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current || 0), 0);
        setBalance({ total: totalBalance.toLocaleString() });

        const totalAvailable = accounts.reduce((sum, acc) => sum + (acc.available || 0), 0);
        setKpis((prev) => prev.map((kpi) => {
          if (kpi.title === 'Saved') return { ...kpi, value: `₹${totalAvailable.toLocaleString()}` };
          return kpi;
        }));
      }

      if (txRes.status === 'fulfilled' && txRes.value?.data) {
        const txs = txRes.value.data.transactions || [];
        if (txs.length > 0) {
          const formattedTxs = txs.slice(0, 10).map((tx) => ({
            name: tx.merchant_name || tx.category || 'Transaction',
            date: new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: Math.abs(tx.amount).toLocaleString(),
            icon: CATEGORY_ICONS[tx.category] || '💳',
            positive: tx.amount < 0,
          }));
          setTransactions(formattedTxs);

          const totalSpent = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
          setKpis((prev) => prev.map((kpi) => {
            if (kpi.title === 'Spent') return { ...kpi, value: `₹${totalSpent.toLocaleString()}` };
            return kpi;
          }));

          const catMap = {};
          txs.forEach((tx) => {
            const cat = tx.category || 'Other';
            catMap[cat] = (catMap[cat] || 0) + Math.abs(tx.amount);
          });
          const totalCat = Object.values(catMap).reduce((s, v) => s + v, 0);
          const catColors = ['#7c6aff', '#4effd6', '#ffd166', '#ff6b6b', '#a78bfa'];
          const cats = Object.entries(catMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, amount], idx) => ({
              name,
              amount: amount.toLocaleString(),
              icon: CATEGORY_ICONS[name] || '📋',
              color: catColors[idx % catColors.length],
              progress: Math.round((amount / totalCat) * 100),
            }));
          if (cats.length > 0) setCategories(cats);
        }
      }

      if (aiRes.status === 'fulfilled' && aiRes.value?.data) {
        const data = aiRes.value.data;
        if (data.insights) setInsights(data.insights);
      }
    } catch (err) {
      // Use mock data on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  return {
    userName,
    balance,
    kpis,
    spendingTrend,
    categories,
    transactions,
    insights,
    loading,
    refreshing,
    onRefresh,
  };
};
