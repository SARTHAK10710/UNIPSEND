import { useState, useCallback } from 'react';
import usePortfolio from './usePortfolio';

export const useInvestment = () => {
  const {
    account,
    positions,
    orders,
    movers,
    allocation,
    aiAllocation,
    healthScore,
    isLoading,
    orderLoading,
    error,
    getTotalPnL,
    getPortfolioValue,
    getBuyingPower,
    getDayPnL,
    executeTrade,
    fetchStockHistory,
    refresh,
  } = usePortfolio();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return {
    account,
    holdings: positions,
    movers,
    orders,
    allocation: aiAllocation.length > 0 ? aiAllocation : (allocation
      ? Object.entries(allocation)
          .filter(([, v]) => v > 0)
          .map(([name, percentage]) => ({
            name: name === 'equity' ? 'US Equity'
              : name === 'indian' ? 'Indian Equity'
              : name === 'crypto' ? 'Crypto'
              : 'Other',
            percentage,
            value: 0,
            color: name === 'equity' ? '#7c6aff'
              : name === 'indian' ? '#4effd6'
              : name === 'crypto' ? '#ffd166'
              : '#888888',
          }))
      : []),

    accountLoading: isLoading,
    holdingsLoading: isLoading,
    moversLoading: isLoading,
    orderLoading,

    error,

    placeOrder: executeTrade,
    fetchStockHistory,
    refresh,
    refreshing,
    onRefresh,
  };
};
