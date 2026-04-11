// ─────────────────────────────────────────────────────────────
// useMarketData
//
// React hook that fetches historical stock market data from
// Alpha Vantage for a given symbol.
//
// Usage:
//   const { data, loading, error } = useMarketData('AAPL');
//
// Returns:
//   data    → { meta, timeSeries } from Alpha Vantage daily endpoint
//   loading → boolean
//   error   → string | null
//   refresh → function to re-fetch
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStockData } from '../services/alphaVantageService';

/**
 * @param {string} symbol      - Stock symbol (e.g. "AAPL")
 * @param {string} outputSize  - "compact" (100 days) or "full" (20+ years)
 */
export const useMarketData = (symbol, outputSize = 'compact') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setData(null);
      setLoading(false);
      return;
    }

    if (isFetching.current) return;
    isFetching.current = true;

    setLoading(true);
    setError(null);

    try {
      const result = await getStockData(symbol, outputSize);
      setData(result);
    } catch (err) {
      console.error('[useMarketData] error:', err.message);
      setError(err.message || `Failed to load market data for ${symbol}`);
      setData(null);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [symbol, outputSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
};

export default useMarketData;
