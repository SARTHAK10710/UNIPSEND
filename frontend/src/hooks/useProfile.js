import { useState, useCallback } from 'react';
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
      const [profileRes, riskRes, balRes] = await Promise.allSettled([
        userAPI.getProfile(),
        userAPI.getRiskScore(),
        plaidAPI.getBalance(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        const data = profileRes.value.data;
        setProfile({
          name: data.name || profile.name,
          email: data.email || profile.email,
        });
        if (data.emergencyFund) setEmergencyFund(data.emergencyFund);
      }

      if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
        const data = riskRes.value.data;
        if (data.score !== undefined) {
          setRiskScore(data.score);
          setRiskLabel(
            data.score < 40 ? 'Conservative' : data.score < 70 ? 'Moderate' : 'Aggressive'
          );
        }
      }

      if (balRes.status === 'fulfilled' && balRes.value?.data?.accounts) {
        setConnectedAccounts(balRes.value.data.accounts);
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
