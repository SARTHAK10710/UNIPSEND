import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import useTransactions from './useTransactions';
import useAllInsights from './useAllInsights';
import { filterByMonth } from '../utils/dataTransformers';

const ACCOUNT_ICONS = { depository: '🏦', credit: '💳', investment: '📈', loan: '🏛️' };
const ACCOUNT_COLORS = { depository: '#1a73e8', credit: '#ff6b6b', investment: '#4effd6', loan: '#ffd166' };

export const useProfile = () => {
  const { user } = useAuth();
  const {
    accounts,
    transactions,
    getTotalBalance,
    isLoading: txnLoading,
  } = useTransactions();

  const {
    getHealthScore,
    getSpenderType,
    isLoading: insightsLoading,
  } = useAllInsights();

  const [profile, setProfile] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [riskLabel, setRiskLabel] = useState(null);
  const [segment, setSegment] = useState(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const connectedAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    return accounts.map((acc) => ({
      name: acc.name || acc.official_name || 'Account',
      type: acc.subtype || acc.type || 'Account',
      icon: ACCOUNT_ICONS[acc.type] || '🏦',
      color: ACCOUNT_COLORS[acc.type] || '#1a73e8',
      connected: true,
      balance: acc.current,
      available: acc.available,
    }));
  }, [accounts]);

  const emergencyFund = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    const savingsAccount = accounts.find(
      (a) => a.subtype === 'savings' || a.type === 'depository'
    );
    const savingsBalance = savingsAccount?.current || 0;

    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthTxs = filterByMonth(transactions, lastMonth, lastMonthYear);
    const monthlySpend = lastMonthTxs.reduce(
      (sum, tx) => sum + Math.abs(tx.amount || 0), 0
    );

    const emergencyTarget = monthlySpend * 6;
    return {
      current: Math.round(savingsBalance),
      target: Math.round(emergencyTarget) || 1,
      percent: emergencyTarget > 0
        ? Math.round((savingsBalance / emergencyTarget) * 100)
        : 0,
    };
  }, [accounts, transactions]);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await userAPI.getProfile();
      const data = res.data;
      setProfile({
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || user?.displayName || '',
        email: data.email || user?.email || '',
        firstName: data.first_name,
        lastName: data.last_name,
      });
    } catch (err) {
      console.error('[useProfile] fetchProfile error:', err.message);
      setProfile({
        name: user?.displayName || '',
        email: user?.email || '',
      });
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const fetchRiskScore = useCallback(async () => {
    setRiskLoading(true);
    try {
      const res = await userAPI.getRiskScore();
      const data = res.data;
      setRiskScore(data.risk_score);
      setRiskLabel(data.label);
      setSegment(data.segment);
    } catch (err) {
      console.error('[useProfile] fetchRiskScore error:', err.message);
      setRiskScore(null);
      setRiskLabel(null);
    } finally {
      setRiskLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.allSettled([fetchProfile(), fetchRiskScore()]);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('[useProfile] fetchAll error:', err.message);
    }
  }, [fetchProfile, fetchRiskScore]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isLoading = profileLoading && riskLoading && txnLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  return {
    profile,
    riskScore,
    riskLabel,
    segment,
    emergencyFund,
    connectedAccounts,
    healthScore: getHealthScore(),
    spenderType: getSpenderType(),
    totalBalance: getTotalBalance(),
    loading: isLoading,
    refreshing,
    onRefresh,
    error,
    refresh: fetchAll,
  };
};
