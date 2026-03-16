import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, plaidAPI } from '../services/api';

const MOCK_CONNECTED_ACCOUNTS = [
  { name: 'HDFC Bank', type: 'Savings Account', icon: '🏦', color: '#1a73e8', connected: true },
  { name: 'SBI Card', type: 'Credit Card', icon: '💳', color: '#ff6b6b', connected: true },
  { name: 'ICICI Bank', type: 'Current Account', icon: '🏛️', color: '#ffd166', connected: false },
];

export const useProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.displayName || 'Sarthak Negi',
    email: user?.email || 'sarthak@unispend.com',
  });
  const [riskScore, setRiskScore] = useState(64);
  const [riskLabel, setRiskLabel] = useState('Moderate');
  const [emergencyFund, setEmergencyFund] = useState({ current: 45000, target: 75000 });
  const [connectedAccounts, setConnectedAccounts] = useState(MOCK_CONNECTED_ACCOUNTS);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, riskRes, balRes] = await Promise.allSettled([
        userAPI.getProfile(),
        userAPI.getRiskScore(),
        plaidAPI.getBalance(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        const data = profileRes.value.data;
        setProfile({
          name: [data.first_name, data.last_name].filter(Boolean).join(' ') || profile.name,
          email: data.email || profile.email,
        });
      }

      if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
        const data = riskRes.value.data;
        if (data.risk_score !== undefined) {
          setRiskScore(data.risk_score);
          setRiskLabel(data.label || (
            data.risk_score < 34 ? 'Conservative' : data.risk_score < 67 ? 'Moderate' : 'Aggressive'
          ));
        }
      }

      if (balRes.status === 'fulfilled' && balRes.value?.data?.accounts) {
        const accounts = balRes.value.data.accounts;
        const ACCOUNT_ICONS = { depository: '🏦', credit: '💳', investment: '📈', loan: '🏛️' };
        const ACCOUNT_COLORS = { depository: '#1a73e8', credit: '#ff6b6b', investment: '#4effd6', loan: '#ffd166' };
        const formatted = accounts.map((acc) => ({
          name: acc.name || acc.official_name || 'Account',
          type: acc.subtype || acc.type || 'Account',
          icon: ACCOUNT_ICONS[acc.type] || '🏦',
          color: ACCOUNT_COLORS[acc.type] || '#1a73e8',
          connected: true,
          balance: acc.current,
          available: acc.available,
        }));
        if (formatted.length > 0) setConnectedAccounts(formatted);
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
    profile,
    riskScore,
    riskLabel,
    emergencyFund,
    connectedAccounts,
    loading,
    refreshing,
    onRefresh,
  };
};
