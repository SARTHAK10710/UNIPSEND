import { useState, useCallback, useEffect } from 'react';
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      setLoading(true);
      const [txRes, aiRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        aiAPI.getInsights(),
      ]);

      if (txRes.status === 'fulfilled' && txRes.value?.data) {
        const txs = txRes.value.data.transactions || [];
        if (txs.length > 0) {
          const catMap = {};
          const dailyMap = {};
          const catColors = ['#7c6aff', '#4effd6', '#ffd166', '#ff6b6b', '#a78bfa'];

          txs.forEach((tx) => {
            const cat = tx.category || 'Other';
            const amount = Math.abs(tx.amount || 0);
            catMap[cat] = (catMap[cat] || 0) + amount;

            const dayName = DAY_NAMES[new Date(tx.date).getDay()];
            dailyMap[dayName] = (dailyMap[dayName] || 0) + amount;
          });

          const cats = Object.entries(catMap)
            .sort(([, a], [, b]) => b - a)
            .map(([name, amount], idx) => ({
              name,
              amount: Math.round(amount),
              color: catColors[idx % catColors.length],
            }));
          if (cats.length > 0) setCategoryBreakdown(cats);

          const dailyArr = DAY_NAMES.slice(1).concat(DAY_NAMES[0]).map((day) => {
            const amt = Math.round(dailyMap[day] || 0);
            return { day, amount: amt, isHigh: false };
          });
          const maxDay = Math.max(...dailyArr.map((d) => d.amount));
          dailyArr.forEach((d) => { if (d.amount === maxDay && maxDay > 0) d.isHigh = true; });
          if (dailyArr.some((d) => d.amount > 0)) setDailyData(dailyArr);

          const heatmap = txs.slice(0, 28).map((tx) => Math.abs(tx.amount || 0));
          while (heatmap.length < 28) heatmap.push(0);
          setHeatmapData(heatmap);
        }
      }

      if (aiRes.status === 'fulfilled' && aiRes.value?.data?.suggestions) {
        setSuggestions(aiRes.value.data.suggestions);
      }
    } catch (err) {
      // Use mock data
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
