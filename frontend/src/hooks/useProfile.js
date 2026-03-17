import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, plaidAPI, aiAPI } from '../services/api';
import { filterByMonth, transformToAIFormat } from '../utils/dataTransformers';

const ACCOUNT_ICONS = { depository: '🏦', credit: '💳', investment: '📈', loan: '🏛️' };
const ACCOUNT_COLORS = { depository: '#1a73e8', credit: '#ff6b6b', investment: '#4effd6', loan: '#ffd166' };

export const useProfile = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [riskLabel, setRiskLabel] = useState(null);
  const [segment, setSegment] = useState(null);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  const [profileLoading, setProfileLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      console.log('[useProfile] fetching profile...');
      const res = await userAPI.getProfile();
      const data = res.data;
      setProfile({
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || user?.displayName || '',
        email: data.email || user?.email || '',
        firstName: data.first_name,
        lastName: data.last_name,
      });
      console.log('[useProfile] profile loaded:', data);
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
      console.log('[useProfile] fetching risk score via AI...');
      // Get data for AI
      const [balRes, txRes] = await Promise.all([
        plaidAPI.getBalance(),
        plaidAPI.getTransactions()
      ]);
      
      const transactions = txRes.data?.transactions || [];
      const currentBalance = balRes.data?.accounts?.reduce((sum, acc) => sum + (acc.current || 0), 0) || 0;
      
      const aiData = transformToAIFormat(transactions, currentBalance);
      const aiRes = await aiAPI.analyze(aiData);
      
      if (aiRes.data) {
        setRiskScore(aiRes.data.risk_score * 100); // UI expects 0-100 probably, or check guidance. API guide says risk_score is e.g. 0.32
        setRiskLabel(aiRes.data.spender_type || 'Moderate');
        setSegment(aiRes.data.spending_trend || 'Analyzing');
        console.log('[useProfile] AI risk score loaded:', aiRes.data);
      }
    } catch (err) {
      console.error('[useProfile] fetchRiskScore error:', err.message);
      // Fallback to legacy if possible or stay null
    } finally {
      setRiskLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      console.log('[useProfile] fetching connected accounts...');
      const res = await plaidAPI.getBalance();
      const accounts = res.data?.accounts || [];

      const formatted = accounts.map((acc) => ({
        name: acc.name || acc.official_name || 'Account',
        type: acc.subtype || acc.type || 'Account',
        icon: ACCOUNT_ICONS[acc.type] || '🏦',
        color: ACCOUNT_COLORS[acc.type] || '#1a73e8',
        connected: true,
        balance: acc.current,
        available: acc.available,
      }));
      setConnectedAccounts(formatted);
      console.log('[useProfile] accounts loaded:', formatted.length);

      const savingsAccount = accounts.find((a) => a.subtype === 'savings' || a.type === 'depository');
      const savingsBalance = savingsAccount?.current || 0;

      const txRes = await plaidAPI.getTransactions();
      const txs = txRes.data?.transactions || [];
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastMonthTxs = filterByMonth(txs, lastMonth, lastMonthYear);
      const monthlySpend = lastMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      const emergencyTarget = monthlySpend * 6;
      setEmergencyFund({
        current: Math.round(savingsBalance),
        target: Math.round(emergencyTarget) || 1,
        percent: emergencyTarget > 0 ? Math.round((savingsBalance / emergencyTarget) * 100) : 0,
      });
    } catch (err) {
      console.error('[useProfile] fetchAccounts error:', err.message);
      setConnectedAccounts([]);
      setEmergencyFund(null);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchProfile(), fetchRiskScore(), fetchAccounts()]);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('[useProfile] fetchAll error:', err.message);
    }
  }, [fetchProfile, fetchRiskScore, fetchAccounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isLoading = profileLoading && riskLoading && accountsLoading;

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
    loading: isLoading,
    refreshing,
    onRefresh,
    error,
    refresh: fetchAll,
  };
};
