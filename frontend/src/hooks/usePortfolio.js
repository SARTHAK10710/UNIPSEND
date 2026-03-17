import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { investmentAPI } from '../services/api';
import {
  getAccount,
  getPortfolio,
  getMarketMovers,
  getStockHistory,
  calculateAllocation,
} from '../services/alpacaService';
import useAllInsights from './useAllInsights';

const usePortfolio = () => {
  const { user } = useAuth();
  const { portfolioRec, getHealthScore } = useAllInsights();

  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [movers, setMovers] = useState([]);
  const [allocation, setAllocation] = useState({
    equity: 0,
    indian: 0,
    crypto: 0,
    other: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    console.log('[usePortfolio] fetching portfolio...');

    const [accountRes, positionsRes, ordersRes, moversRes] =
      await Promise.allSettled([
        getAccount(),
        getPortfolio(),
        investmentAPI.getOrders(),
        getMarketMovers(),
      ]);

    if (accountRes.status === 'fulfilled') {
      console.log('[usePortfolio] account:', accountRes.value);
      setAccount(accountRes.value);
    } else {
      console.log(
        '[usePortfolio] account error:',
        accountRes.reason?.message
      );
      setAccount({
        portfolioValue: 0,
        buyingPower: 0,
        cash: 0,
        dayPnl: 0,
      });
    }

    if (positionsRes.status === 'fulfilled') {
      const pos = positionsRes.value;
      console.log('[usePortfolio] positions:', pos.length);
      setPositions(pos);
      setAllocation(calculateAllocation(pos));
    } else {
      console.log(
        '[usePortfolio] positions error:',
        positionsRes.reason?.message
      );
      setPositions([]);
    }

    if (ordersRes.status === 'fulfilled') {
      setOrders(ordersRes.value.data?.orders || []);
    } else {
      setOrders([]);
    }

    if (moversRes.status === 'fulfilled') {
      setMovers(moversRes.value);
    } else {
      setMovers([]);
    }

    setIsLoading(false);
  }, [user]);

  const executeTrade = useCallback(
    async (symbol, qty, side) => {
      setOrderLoading(true);
      try {
        console.log('[usePortfolio] placing order:', { symbol, qty, side });
        const response = await investmentAPI.placeOrder({ symbol, qty, side });
        console.log('[usePortfolio] order result:', response.data);

        await fetchPortfolioData();

        return {
          success: true,
          order: response.data.order,
          simulated: response.data.simulated || false,
        };
      } catch (err) {
        console.error('[usePortfolio] order error:', err.message);

        const errorMsg =
          err.response?.data?.error || err.message || 'Order failed';
        const errorCode = err.response?.data?.code || 'UNKNOWN';

        return {
          success: false,
          error: errorMsg,
          code: errorCode,
        };
      } finally {
        setOrderLoading(false);
      }
    },
    [fetchPortfolioData]
  );


  const fetchStockHistory = useCallback(async (symbol, period = '1M') => {
    try {
      const history = await getStockHistory(symbol);

      const days =
        period === '1W' ? 7 : period === '1M' ? 30 : period === '3M' ? 90 : 30;

      return history.slice(-days);
    } catch (err) {
      console.log('[usePortfolio] history error:', err.message);
      return [];
    }
  }, []);

  const getTotalPnL = useCallback(() => {
    if (!positions || positions.length === 0) return 0;
    return positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
  }, [positions]);

  const getPortfolioValue = useCallback(() => {
    return account?.portfolioValue || 0;
  }, [account]);

  const getBuyingPower = useCallback(() => {
    return account?.buyingPower || 0;
  }, [account]);

  const getDayPnL = useCallback(() => {
    return account?.dayPnl || 0;
  }, [account]);

  const getAIAllocation = useCallback(() => {
    if (!portfolioRec || portfolioRec.length === 0) {
      return [];
    }
    return portfolioRec.map((item) => ({
      asset: item.asset,
      allocation: Math.round(item.allocation * 100),
      color: getAssetColor(item.asset),
    }));
  }, [portfolioRec]);

  const getAssetColor = (symbol) => {
    const cryptoSymbols = ['BTC', 'ETH', 'DOGE'];
    const indianSuffix = ['.BSE', '.NSE'];

    if (cryptoSymbols.includes(symbol)) return '#ffd166';
    if (indianSuffix.some((s) => symbol.endsWith(s))) return '#4effd6';
    return '#7c6aff';
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    account,
    positions,
    orders,
    movers,
    allocation,
    aiAllocation: getAIAllocation(),
    healthScore: getHealthScore(),

    isLoading,
    orderLoading,
    error,

    getTotalPnL,
    getPortfolioValue,
    getBuyingPower,
    getDayPnL,

    executeTrade,
    fetchStockHistory,
    refresh: fetchPortfolioData,
  };
};

export default usePortfolio;
