import { useState, useCallback, useEffect } from 'react';
import { investmentAPI, userAPI } from '../services/api';
import { useAIInsights } from './useAIInsights';
import { usePortfolio } from './usePortfolio';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'DOGE', 'SOL', 'ADA', 'XRP', 'MATIC', 'DOT', 'AVAX', 'LINK'];

const isIndianStock = (symbol) => symbol.endsWith('.BSE') || symbol.endsWith('.NSE');
const isCrypto = (symbol) => CRYPTO_SYMBOLS.includes(symbol.toUpperCase());

const calculateAllocation = (holdings) => {
  if (!holdings || holdings.length === 0) return [];

  const total = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
  if (total === 0) return [];

  let usEquity = 0;
  let indianEquity = 0;
  let crypto = 0;

  holdings.forEach((h) => {
    const value = h.marketValue || 0;
    if (isCrypto(h.symbol)) {
      crypto += value;
    } else if (isIndianStock(h.symbol)) {
      indianEquity += value;
    } else {
      usEquity += value;
    }
  });

  const calcPercent = (val) => total > 0 ? Math.round((val / total) * 100) : 0;

  const result = [];
  if (usEquity > 0) result.push({ name: 'US Equity', percentage: calcPercent(usEquity), value: usEquity, color: '#7c6aff' });
  if (indianEquity > 0) result.push({ name: 'Indian Equity', percentage: calcPercent(indianEquity), value: indianEquity, color: '#4effd6' });
  if (crypto > 0) result.push({ name: 'Crypto', percentage: calcPercent(crypto), value: crypto, color: '#ffd166' });

  return result;
};

export const useInvestment = () => {
  const ai = useAIInsights();
  const [account, setAccount] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [movers, setMovers] = useState(null);
  const [orders, setOrders] = useState([]);
  const [allocation, setAllocation] = useState([]);
  const [riskProfile, setRiskProfile] = useState({ risk_score: 0, label: 'Calculating...' });

  const [accountLoading, setAccountLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [moversLoading, setMoversLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);

  const [error, setError] = useState(null);

  const fetchAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      const res = await investmentAPI.getAccount();
      const data = res.data;
      setAccount({
        portfolioValue: data.portfolioValue,
        buyingPower: data.buyingPower,
        cash: data.cash,
        dayPnl: data.dayPnl,
        totalPnl: data.totalPnl,
      });
      console.log('[useInvestment] account:', data);
    } catch (err) {
      console.error('[useInvestment] fetchAccount error:', err.message);
      setAccount(null);
    } finally {
      setAccountLoading(false);
    }
  }, []);

  const fetchHoldings = useCallback(async () => {
    setHoldingsLoading(true);
    try {
      const res = await investmentAPI.getPortfolio();
      const data = res.data.holdings || [];
      setHoldings(data);
      setAllocation(calculateAllocation(data));
      console.log('[useInvestment] holdings:', data);
    } catch (err) {
      console.error('[useInvestment] fetchHoldings error:', err.message);
      setHoldings([]);
      setAllocation([]);
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  const fetchMovers = useCallback(async () => {
    setMoversLoading(true);
    try {
      const res = await investmentAPI.getMovers();
      setMovers(res.data);
      console.log('[useInvestment] movers:', res.data);
    } catch (err) {
      console.error('[useInvestment] fetchMovers error:', err.message);
      setMovers(null);
    } finally {
      setMoversLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await investmentAPI.getOrders();
      setOrders(res.data.orders || []);
      console.log('[useInvestment] orders:', res.data.orders);
    } catch (err) {
      console.error('[useInvestment] fetchOrders error:', err.message);
      setOrders([]);
    }
  }, []);

  const fetchRiskProfile = useCallback(async () => {
    try {
      const res = await userAPI.getRiskScore();
      setRiskProfile(res.data || { risk_score: 0, label: 'Moderate' });
      console.log('[useInvestment] risk profile:', res.data);
    } catch (err) {
      console.error('[useInvestment] fetchRiskProfile error:', err.message);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        fetchAccount(),
        fetchHoldings(),
        fetchMovers(),
        fetchOrders(),
        fetchRiskProfile(),
      ]);
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('[useInvestment] fetchAll error:', err.message);
    }
  }, [fetchAccount, fetchHoldings, fetchMovers, fetchOrders]);

  const placeOrder = useCallback(async (symbol, qty, side) => {
    setOrderLoading(true);
    try {
      const res = await investmentAPI.placeOrder({ symbol, qty, side });
      console.log('[useInvestment] order placed:', res.data);
      await fetchHoldings();
      await fetchAccount();
      return { success: true, order: res.data };
    } catch (err) {
      console.error('[useInvestment] placeOrder error:', err.message);
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setOrderLoading(false);
    }
  }, [fetchHoldings, fetchAccount]);

  const fetchStockHistory = useCallback(async (symbol, period = '1M') => {
    try {
      const res = await investmentAPI.getHistory(symbol);
      const data = res.data;
      const history = Array.isArray(data) ? data : (data.history || []);

      const days = period === '1W' ? 7 : period === '1M' ? 30 : 90;
      return history.slice(0, days).reverse();
    } catch (err) {
      console.error('[useInvestment] fetchStockHistory error:', err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // AI portfolio — depends on monthly estimate + health score
  const aiPortfolio = usePortfolio(
    ai.getMonthlyEstimate(),
    ai.getHealthScore(),
  );

  return {
    account,
    holdings,
    movers,
    orders,
    allocation,
    riskProfile,

    accountLoading,
    holdingsLoading,
    moversLoading,
    orderLoading,

    error,

    placeOrder,
    fetchStockHistory,
    refresh: fetchAll,

    // AI data
    aiPortfolio: aiPortfolio.portfolio,
    aiPortfolioLoading: aiPortfolio.isLoading,
    investmentAdvice: ai.getInvestmentAdvice(),
    aiHealthScore: ai.getHealthScore(),
    aiLoading: ai.isLoading,
    aiAvailable: ai.apiAvailable,
  };
};
