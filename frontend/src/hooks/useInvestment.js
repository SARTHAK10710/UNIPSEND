import { useState, useCallback, useEffect, useRef } from 'react';
import { investmentAPI } from '../services/api';
import { useAIInsights } from './useAIInsights';
import { usePortfolio } from './usePortfolio';
import { getLatestPrice as alpacaGetPrice } from '../services/alpacaService';
import { getStockData, getIndicator } from '../services/alphaVantageService';

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

  // ── New: Live price & market data state ──────────────────
  const [livePrices, setLivePrices] = useState({});     // { AAPL: 260.43, ... }
  const [stockData, setStockData] = useState(null);     // Alpha Vantage daily data
  const [stockIndicator, setStockIndicator] = useState(null); // RSI/MACD data
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const priceCache = useRef({});

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

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        fetchAccount(),
        fetchHoldings(),
        fetchMovers(),
        fetchOrders(),
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

  // ── New: Fetch live price directly from Alpaca ────────────
  const fetchLivePrice = useCallback(async (symbol) => {
    // Check cache (valid for 30s)
    const cached = priceCache.current[symbol];
    if (cached && Date.now() - cached.time < 30000) {
      return cached.price;
    }
    try {
      console.log(`[useInvestment] fetching live price for ${symbol}...`);
      const price = await alpacaGetPrice(symbol);
      if (price) {
        priceCache.current[symbol] = { price, time: Date.now() };
        setLivePrices(prev => ({ ...prev, [symbol]: price }));
      }
      return price;
    } catch (err) {
      console.error('[useInvestment] fetchLivePrice error:', err.message);
      return null;
    }
  }, []);

  // ── New: Fetch live prices for all holdings ────────────────
  const fetchAllLivePrices = useCallback(async () => {
    if (holdings.length === 0) return;
    try {
      const symbols = holdings.map(h => h.symbol);
      console.log('[useInvestment] fetching live prices for:', symbols);
      const prices = await Promise.all(
        symbols.map(s => alpacaGetPrice(s).catch(() => null))
      );
      const priceMap = {};
      symbols.forEach((s, i) => {
        if (prices[i]) {
          priceMap[s] = prices[i];
          priceCache.current[s] = { price: prices[i], time: Date.now() };
        }
      });
      setLivePrices(prev => ({ ...prev, ...priceMap }));
      console.log('[useInvestment] live prices loaded:', priceMap);
    } catch (err) {
      console.error('[useInvestment] fetchAllLivePrices error:', err.message);
    }
  }, [holdings]);

  // ── New: Fetch Alpha Vantage market data for a symbol ──────
  const marketDataFetching = useRef(null);
  const fetchMarketData = useCallback(async (symbol) => {
    // Guard: skip if already fetching this symbol or already showing it
    if (marketDataFetching.current === symbol) return;
    marketDataFetching.current = symbol;

    setSelectedSymbol(symbol);
    setMarketDataLoading(true);
    try {
      console.log(`[useInvestment] fetching Alpha Vantage data for ${symbol}...`);
      const [daily, rsi] = await Promise.all([
        getStockData(symbol).catch(() => null),
        getIndicator(symbol, 'RSI', { time_period: 14 }).catch(() => null),
      ]);
      setStockData(daily);
      setStockIndicator(rsi);
      console.log(`[useInvestment] market data loaded for ${symbol} ✓`);
    } catch (err) {
      console.error('[useInvestment] fetchMarketData error:', err.message);
      setStockData(null);
      setStockIndicator(null);
    } finally {
      setMarketDataLoading(false);
      marketDataFetching.current = null;
    }
  }, []);

  const clearMarketData = useCallback(() => {
    setSelectedSymbol(null);
    setStockData(null);
    setStockIndicator(null);
    marketDataFetching.current = null;
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch live prices after holdings are loaded
  useEffect(() => {
    if (holdings.length > 0) {
      fetchAllLivePrices();
    }
  }, [holdings, fetchAllLivePrices]);

  // AI portfolio — depends on monthly estimate + health score
  const aiPortfolio = usePortfolio(
    ai.getMonthlyEstimate(),
    ai.getHealthScore(),
  );

  // ── Derive risk profile from AI API ────────────────────────────
  const aiRiskRaw = ai.getRiskScore();  // 0–1 decimal
  const riskProfile = {
    risk_score: ai.getRiskScorePercent(),  // 0–100
    label: aiRiskRaw < 0.3 ? 'Conservative'
      : aiRiskRaw < 0.6 ? 'Moderate'
      : aiRiskRaw < 0.8 ? 'Aggressive'
      : 'Very Aggressive',
  };

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

    // ── New: Live prices & market data ──────────────────────
    livePrices,
    fetchLivePrice,
    fetchAllLivePrices,
    stockData,
    stockIndicator,
    selectedSymbol,
    marketDataLoading,
    fetchMarketData,
    clearMarketData,

    // AI data
    aiPortfolio: aiPortfolio.portfolio,
    aiPortfolioLoading: aiPortfolio.isLoading,
    investmentAdvice: ai.getInvestmentAdvice(),
    aiHealthScore: ai.getHealthScore(),
    aiLoading: ai.isLoading,
    aiAvailable: ai.apiAvailable,
  };
};
