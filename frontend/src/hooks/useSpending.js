import { useState, useCallback } from 'react';
import { plaidAPI, aiAPI } from '../services/api';

const MOCK_DAILY = [
  { day: 'Mon', amount: 620, isHigh: false },
  { day: 'Tue', amount: 950, isHigh: false },
  { day: 'Wed', amount: 430, isHigh: false },
  { day: 'Thu', amount: 1200, isHigh: true },
  { day: 'Fri', amount: 780, isHigh: false },
  { day: 'Sat', amount: 340, isHigh: false },
  { day: 'Sun', amount: 850, isHigh: false },
];

const MOCK_CATEGORIES = [
  { name: 'Food & Dining', amount: 4200, color: '#7c6aff' },
  { name: 'Shopping', amount: 2800, color: '#4effd6' },
  { name: 'Transport', amount: 1500, color: '#ffd166' },
  { name: 'Entertainment', amount: 1200, color: '#ff6b6b' },
  { name: 'Bills', amount: 3000, color: '#a78bfa' },
];

const MOCK_SUGGESTIONS = [
  { icon: '🍽️', title: 'Dining Budget', message: 'Your dining spend is 40% above average. Try cooking at home twice more per week.', savings: 1200 },
  { icon: '🚗', title: 'Transport Hack', message: 'Switch to metro for daily commute and save significantly each month.', savings: 800 },
  { icon: '📱', title: 'App Subscriptions', message: 'You have 3 overlapping streaming services. Consider consolidating.', savings: 500 },
];

const MOCK_HEATMAP = Array.from({ length: 28 }, () => Math.floor(Math.random() * 3000));

export const useSpending = () => {
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyData, setDailyData] = useState(MOCK_DAILY);
  const [categoryBreakdown, setCategoryBreakdown] = useState(MOCK_CATEGORIES);
  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS);
  const [heatmapData, setHeatmapData] = useState(MOCK_HEATMAP);

  const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0).toLocaleString();

  const fetchData = useCallback(async () => {
    try {
      const [txRes, aiRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        aiAPI.getInsights(),
      ]);

      if (txRes.status === 'fulfilled' && txRes.value?.data?.transactions) {
        const txs = txRes.value.data.transactions;
        const catMap = {};
        txs.forEach((tx) => {
          const cat = tx.category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + Math.abs(tx.amount || 0);
        });
        const cats = Object.entries(catMap).map(([name, amount], idx) => ({
          name,
          amount,
          color: ['#7c6aff', '#4effd6', '#ffd166', '#ff6b6b', '#a78bfa'][idx % 5],
        }));
        if (cats.length > 0) setCategoryBreakdown(cats);
      }

      if (aiRes.status === 'fulfilled' && aiRes.value?.data?.suggestions) {
        setSuggestions(aiRes.value.data.suggestions);
      }
    } catch (err) {
      // Use mock data
    }
  }, []);

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
    suggestions,
    heatmapData,
    loading,
    refreshing,
    onRefresh,
  };
};
