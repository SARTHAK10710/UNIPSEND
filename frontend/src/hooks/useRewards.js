import { useState, useCallback, useEffect } from 'react';
import { subscriptionAPI } from '../services/api';

const getTier = (total) => {
  if (total >= 3000) return { name: 'Platinum', icon: '💎', color: '#e0e0e0' };
  if (total >= 1500) return { name: 'Gold', icon: '🥇', color: '#ffd166' };
  if (total >= 500) return { name: 'Silver', icon: '🥈', color: '#c0c0c0' };
  return { name: 'Bronze', icon: '🥉', color: '#cd7f32' };
};

const getNextTier = (total) => {
  if (total >= 3000) return { name: 'Platinum', threshold: 3000, remaining: 0 };
  if (total >= 1500) return { name: 'Platinum', threshold: 3000, remaining: 3000 - total };
  if (total >= 500) return { name: 'Gold', threshold: 1500, remaining: 1500 - total };
  return { name: 'Silver', threshold: 500, remaining: 500 - total };
};

export const useRewards = () => {
  const [offers, setOffers] = useState([]);
  const [history, setHistory] = useState([]);
  const [totalCashback, setTotalCashback] = useState(0);
  const [pendingCashback, setPendingCashback] = useState(0);
  const [tier, setTier] = useState(getTier(0));
  const [nextTier, setNextTier] = useState(getNextTier(0));

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[useRewards] fetching rewards...');
      const res = await subscriptionAPI.getRewards();
      const data = res.data;
      console.log('[useRewards] data loaded:', data);

      if (data?.rewards) {
        setOffers(data.rewards.map((r, idx) => ({
          title: r.name || 'Cashback Offer',
          merchant: (r.name || '').toUpperCase(),
          discount: r.type || 'DEAL',
          icon: '🎁',
          color: ['#ff6b6b', '#ffd166', '#7c6aff', '#4effd6', '#c084fc'][idx % 5],
          expiresIn: r.expiration_date
            ? `${Math.max(0, Math.ceil((new Date(r.expiration_date) - new Date()) / 86400000))} days`
            : null,
        })));
      }

      if (data?.history) {
        setHistory(data.history);
        const total = data.history.reduce((sum, h) => sum + (h.amount || 0), 0);
        setTotalCashback(total);
        setTier(getTier(total));
        setNextTier(getNextTier(total));
      }

      if (data?.totalCashback !== undefined) {
        setTotalCashback(data.totalCashback);
        setTier(getTier(data.totalCashback));
        setNextTier(getNextTier(data.totalCashback));
      }

      if (data?.pendingCashback !== undefined) {
        setPendingCashback(data.pendingCashback);
      }
    } catch (err) {
      console.error('[useRewards] fetchData error:', err.message);
      setError(err.response?.data?.message || 'Failed to load rewards');
      setOffers([]);
      setHistory([]);
    } finally {
      setIsLoading(false);
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
    totalCashback,
    pendingCashback,
    offers,
    history,
    tier,
    nextTier,
    loading: isLoading,
    refreshing,
    onRefresh,
    error,
    refresh: fetchData,
  };
};
