import { useState, useEffect, useCallback, useRef } from 'react';
import { aiService } from '../services/aiService';

// ─────────────────────────────────────────────────────────────
// usePortfolio
//
// Fetches AI-recommended investment portfolio allocation
// based on monthly spend and financial health score.
// ─────────────────────────────────────────────────────────────

export const usePortfolio = (monthlySpend, healthScore) => {
  const [portfolio, setPortfolio] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFetching = useRef(false);

  const fetchPortfolio = useCallback(async () => {
    if (!monthlySpend || monthlySpend <= 0) {
      console.log('[usePortfolio] skipping — invalid monthlySpend');
      setPortfolio([]);
      return;
    }

    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[usePortfolio] fetching — spend: ${monthlySpend}, health: ${healthScore}`);
      const res = await aiService.getInvestmentPortfolio(
        monthlySpend,
        healthScore || 50,
      );

      setPortfolio(res.portfolio || []);
      console.log(`[usePortfolio] loaded ${(res.portfolio || []).length} recommendations`);
    } catch (err) {
      console.error('[usePortfolio] error:', err.message);
      setError('Failed to load AI portfolio');
      setPortfolio([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [monthlySpend, healthScore]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    portfolio,
    isLoading,
    error,
    refresh: fetchPortfolio,
  };
};

export default usePortfolio;
