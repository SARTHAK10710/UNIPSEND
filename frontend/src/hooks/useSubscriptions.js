import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscriptionAPI, plaidAPI } from '../services/api';
import { detectRecurringSubscriptions } from '../utils/dataTransformers';

export const useSubscriptions = () => {
  const { user } = useAuth();

  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [forgottenSubscriptions, setForgottenSubscriptions] = useState([]);
  const [scribeUpUrl, setScribeUpUrl] = useState(null);
  const [listPreviewUrl, setListPreviewUrl] = useState(null);
  const [totalMonthly, setTotalMonthly] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      console.log('[useSubscriptions] fetching transactions for recurring detection...');
      const res = await plaidAPI.getTransactions();
      const txs = res.data?.transactions || [];

      const recurring = detectRecurringSubscriptions(txs);
      console.log('[useSubscriptions] detected recurring:', recurring.length);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const active = [];
      const forgotten = [];

      recurring.forEach((sub) => {
        const lastDate = new Date(sub.renewalDate);
        if (lastDate < thirtyDaysAgo) {
          forgotten.push(sub);
        } else {
          active.push(sub);
        }
      });

      setActiveSubscriptions(active);
      setForgottenSubscriptions(forgotten);
      setTotalMonthly(recurring.reduce((sum, s) => sum + s.amount, 0));
    } catch (err) {
      console.error('[useSubscriptions] fetchSubscriptions error:', err.message);
      setActiveSubscriptions([]);
      setForgottenSubscriptions([]);
    }
  }, []);

  const fetchScribeUp = useCallback(async () => {
    try {
      console.log('[useSubscriptions] initializing ScribeUp...');
      const res = await subscriptionAPI.initScribeUp({
        user_id: user?.uid || '',
        email: user?.email || '',
        first_name: user?.displayName?.split(' ')[0] || '',
        last_name: user?.displayName?.split(' ').slice(1).join(' ') || '',
      });

      if (res.data?.url) setScribeUpUrl(res.data.url);
      if (res.data?.list_preview_url) setListPreviewUrl(res.data.list_preview_url);
      console.log('[useSubscriptions] ScribeUp loaded:', res.data);
    } catch (err) {
      console.error('[useSubscriptions] fetchScribeUp error:', err.message);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSubscriptions(), fetchScribeUp()]);
    } catch (err) {
      setError('Failed to load subscriptions');
      console.error('[useSubscriptions] fetchAll error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscriptions, fetchScribeUp]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  return {
    totalMonthly,
    activeSubscriptions,
    forgottenSubscriptions,
    scribeUpUrl,
    listPreviewUrl,
    loading: isLoading,
    refreshing,
    onRefresh,
    error,
    refresh: fetchAll,
  };
};
