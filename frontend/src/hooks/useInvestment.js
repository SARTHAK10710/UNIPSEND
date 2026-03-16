import { useState, useCallback, useEffect } from 'react';
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

const SYMBOL_ICONS = {
  SPY: '📊', AAPL: '🍎', 'RELIANCE.BSE': '🏭', 'TCS.BSE': '💻',
  'NIFTYBEES.BSE': '📈', BTC: '₿',
};

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
      setLoading(true);
      const [portfolioRes, accountRes, riskRes, moversRes] = await Promise.allSettled([
        investmentAPI.getPortfolio(),
        investmentAPI.getAccount(),
        userAPI.getRiskScore(),
        investmentAPI.getMovers(),
      ]);

      if (accountRes.status === 'fulfilled' && accountRes.value?.data) {
        const acc = accountRes.value.data;
        setPortfolio({
          totalValue: (acc.portfolioValue || 0).toLocaleString(),
          todayReturn: (acc.dayPnl || 0).toLocaleString(),
          todayReturnPct: acc.portfolioValue
            ? ((acc.dayPnl / acc.portfolioValue) * 100).toFixed(2)
            : '0.00',
        });
      }

      if (portfolioRes.status === 'fulfilled' && portfolioRes.value?.data?.holdings) {
        const h = portfolioRes.value.data.holdings;
        if (h.length > 0) {
          const formattedHoldings = h.map((pos) => ({
            symbol: pos.symbol,
            name: pos.symbol,
            price: (pos.currentPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            change: pos.unrealizedPnlPercent ? (pos.unrealizedPnlPercent * 100).toFixed(2) : 0,
            icon: SYMBOL_ICONS[pos.symbol] || '📊',
            qty: pos.qty,
            marketValue: pos.marketValue,
            pnl: pos.unrealizedPnl,
          }));
          setHoldings(formattedHoldings);
        }
      }

      if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
        const data = riskRes.value.data;
        if (data.risk_score !== undefined) {
          setRiskScore(data.risk_score);
          setRiskLabel(data.label || (
            data.risk_score < 34 ? 'Conservative' : data.risk_score < 67 ? 'Moderate Risk' : 'Aggressive'
          ));
        }
      }

      if (moversRes.status === 'fulfilled' && moversRes.value?.data) {
        const data = moversRes.value.data;
        const allMovers = [...(data.gainers || []), ...(data.losers || [])];
        if (allMovers.length > 0) {
          const formatted = allMovers.map((m) => ({
            symbol: m.symbol,
            price: (m.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            change: parseFloat(m.changePercent) || 0,
            icon: SYMBOL_ICONS[m.symbol] || '📊',
          }));
          setMarketMovers(formatted);
        }
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
