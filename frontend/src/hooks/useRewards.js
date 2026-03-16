import { useState, useCallback, useEffect } from 'react';
import { subscriptionAPI } from '../services/api';

const MOCK_OFFERS = [
  { title: '10% Off Food', merchant: 'SWIGGY', discount: '10% OFF', icon: '🍕', color: '#ff6b6b', expiresIn: '3 days' },
  { title: 'Free Delivery', merchant: 'AMAZON', discount: 'FREE', icon: '📦', color: '#ffd166', expiresIn: '5 days' },
  { title: '₹200 Cashback', merchant: 'PHONPE', discount: '₹200', icon: '💰', color: '#7c6aff', expiresIn: '7 days' },
  { title: '5% Back', merchant: 'FLIPKART', discount: '5% BACK', icon: '🛒', color: '#4effd6', expiresIn: '2 days' },
];

const MOCK_PERSONALIZED = [
  { title: 'Grocery Savings', discount: '15% OFF', icon: '🥬' },
  { title: 'Travel Deal', discount: '₹500 OFF', icon: '✈️' },
  { title: 'Electronics', discount: '20% OFF', icon: '📱' },
  { title: 'Fashion Sale', discount: 'BOGO', icon: '👗' },
];

const MOCK_HISTORY = [
  { merchant: 'Amazon India', date: 'Oct 22, 2023', amount: '150', icon: '📦' },
  { merchant: 'Swiggy', date: 'Oct 20, 2023', amount: '45', icon: '🍕' },
  { merchant: 'Flipkart', date: 'Oct 18, 2023', amount: '200', icon: '🛒' },
  { merchant: 'Uber', date: 'Oct 15, 2023', amount: '80', icon: '🚗' },
  { merchant: 'Zomato', date: 'Oct 12, 2023', amount: '60', icon: '🍽️' },
];

const CAMPAIGN_COLORS = ['#ff6b6b', '#ffd166', '#7c6aff', '#4effd6', '#a78bfa'];

export const useRewards = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCashback, setTotalCashback] = useState('2,450');
  const [pendingCashback, setPendingCashback] = useState('350');
  const [offers, setOffers] = useState(MOCK_OFFERS);
  const [personalizedOffers, setPersonalizedOffers] = useState(MOCK_PERSONALIZED);
  const [history, setHistory] = useState(MOCK_HISTORY);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await subscriptionAPI.getRewards();
      if (res.data) {
        if (res.data.rewards && res.data.rewards.length > 0) {
          const formattedOffers = res.data.rewards.map((r, idx) => ({
            title: r.name || 'Cashback Offer',
            merchant: (r.name || '').toUpperCase(),
            discount: r.type || 'DEAL',
            icon: '🎁',
            color: CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length],
            expiresIn: r.expiration_date
              ? `${Math.ceil((new Date(r.expiration_date) - new Date()) / 86400000)} days`
              : 'Limited',
          }));
          setOffers(formattedOffers);
        }
        if (res.data.totalCashback) setTotalCashback(res.data.totalCashback);
        if (res.data.history) setHistory(res.data.history);
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
    totalCashback,
    pendingCashback,
    offers,
    personalizedOffers,
    history,
    loading,
    refreshing,
    onRefresh,
  };
};
