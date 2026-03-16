import { useState, useCallback } from 'react';
import { subscriptionAPI } from '../services/api';

const MOCK_ACTIVE = [
  { name: 'Netflix', amount: 649, renewalDate: 'Nov 15', icon: '🎬', color: '#e50914' },
  { name: 'Spotify', amount: 119, renewalDate: 'Nov 8', icon: '🎵', color: '#1db954' },
  { name: 'YouTube Premium', amount: 149, renewalDate: 'Nov 20', icon: '▶️', color: '#ff0000' },
  { name: 'iCloud', amount: 75, renewalDate: 'Nov 1', icon: '☁️', color: '#3b82f6' },
  { name: 'ChatGPT Plus', amount: 1650, renewalDate: 'Nov 12', icon: '🤖', color: '#10a37f' },
];

const MOCK_FORGOTTEN = [
  { name: 'Adobe CC', amount: 1675, renewalDate: 'Nov 5', icon: '🎨', color: '#ff0000' },
  { name: 'Headspace', amount: 399, renewalDate: 'Nov 18', icon: '🧘', color: '#f47d31' },
];

export const useSubscriptions = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState(MOCK_ACTIVE);
  const [forgottenSubscriptions, setForgottenSubscriptions] = useState(MOCK_FORGOTTEN);
  const [scribeUpUrl, setScribeUpUrl] = useState(null);

  const totalMonthly = [...activeSubscriptions, ...forgottenSubscriptions]
    .reduce((sum, s) => sum + s.amount, 0)
    .toLocaleString();

  const fetchData = useCallback(async () => {
    try {
      const scribeRes = await subscriptionAPI.initScribeUp();
      if (scribeRes.data?.url) {
        setScribeUpUrl(scribeRes.data.url);
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
    totalMonthly,
    activeSubscriptions,
    forgottenSubscriptions,
    scribeUpUrl,
    loading,
    refreshing,
    onRefresh,
  };
};
