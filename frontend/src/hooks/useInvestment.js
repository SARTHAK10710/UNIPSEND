import { useState, useCallback } from 'react';
import { investmentAPI, userAPI } from '../services/api';

const MOCK_PORTFOLIO = {
  totalValue: '41,250',
  todayReturn: '1,250',
  todayReturnPct: '3.12',
};

const MOCK_HOLDINGS = [
  { symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 ETF', price: '245.30', change: 1.45, icon: '📊' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: '4,120.00', change: -0.25, icon: '💻' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: '2,980.50', change: 2.10, icon: '🏭' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', price: '1,645.20', change: 0.85, icon: '🏦' },
  { symbol: 'INFY', name: 'Infosys Limited', price: '1,890.00', change: -1.20, icon: '🖥️' },
];

const MOCK_ALLOCATION = [
  { name: 'Equity', color: '#7c6aff' },
  { name: 'Debt', color: '#4effd6' },
  { name: 'Gold', color: '#ffd166' },
  { name: 'Crypto', color: '#ff6b6b' },
];

const MOCK_MOVERS = [
  { symbol: 'TATAMOTORS', price: '985.40', change: 4.2, icon: '🚗' },
  { symbol: 'ADANI', price: '3,210.00', change: -2.8, icon: '⚡' },
  { symbol: 'WIPRO', price: '542.30', change: 1.9, icon: '💻' },
  { symbol: 'SBIN', price: '780.50', change: 0.7, icon: '🏦' },
  { symbol: 'ITC', price: '465.80', change: -0.5, icon: '🏢' },
];

export const useInvestment = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState(MOCK_PORTFOLIO);
  const [riskScore, setRiskScore] = useState(64);
  const [riskLabel, setRiskLabel] = useState('Moderate Risk');
  const [holdings, setHoldings] = useState(MOCK_HOLDINGS);
  const [allocation, setAllocation] = useState(MOCK_ALLOCATION);
  const [marketMovers, setMarketMovers] = useState(MOCK_MOVERS);

  const fetchData = useCallback(async () => {
    try {
      const [portfolioRes, riskRes] = await Promise.allSettled([
        investmentAPI.getPortfolio(),
        userAPI.getRiskScore(),
      ]);

      if (portfolioRes.status === 'fulfilled' && portfolioRes.value?.data) {
        const data = portfolioRes.value.data;
        if (data.totalValue) setPortfolio(data);
        if (data.holdings) setHoldings(data.holdings);
        if (data.allocation) setAllocation(data.allocation);
      }

      if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
        const data = riskRes.value.data;
        if (data.score !== undefined) {
          setRiskScore(data.score);
          setRiskLabel(
            data.score < 40 ? 'Conservative' : data.score < 70 ? 'Moderate Risk' : 'Aggressive'
          );
        }
      }
    } catch (err) {
      // Use mock data
    }
  }, []);

  const placeOrder = useCallback(async (orderData) => {
    const response = await investmentAPI.placeOrder(orderData);
    return response.data;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  return {
    portfolio,
    riskScore,
    riskLabel,
    holdings,
    allocation,
    marketMovers,
    loading,
    refreshing,
    onRefresh,
    placeOrder,
  };
};
