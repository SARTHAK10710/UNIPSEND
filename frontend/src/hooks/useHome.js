import { useState, useCallback } from 'react';
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
      const [txRes, balRes, aiRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        plaidAPI.getBalance(),
        aiAPI.getInsights(),
      ]);

      if (txRes.status === 'fulfilled' && txRes.value?.data) {
        setTransactions(txRes.value.data.transactions || MOCK_TRANSACTIONS);
      }
      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        setBalance(balRes.value.data || { total: '21,020' });
      }
      if (aiRes.status === 'fulfilled' && aiRes.value?.data) {
        setInsights(aiRes.value.data.insights || MOCK_INSIGHTS);
      }
    } catch (err) {
      // Use mock data on failure
    }
  }, []);

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
