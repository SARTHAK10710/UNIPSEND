// ─────────────────────────────────────────────────────────────
// useAlpacaPortfolio
//
// React hook that fetches the user's portfolio positions
// directly from Alpaca's paper trading API.
//
// Returns: { positions, loading, error, refresh }
//
// NOTE: This is separate from usePortfolio.js which handles
// AI-recommended portfolio allocations. This hook provides
// the user's actual live positions from Alpaca.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPositions } from '../services/alpacaService';

export const useAlpacaPortfolio = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFetching = useRef(false);

  const fetchPositions = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    setLoading(true);
    setError(null);

    try {
      const data = await getPositions();

      // Normalize the raw Alpaca position objects for easy consumption
      const normalized = (data || []).map((pos) => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        side: pos.side,
        marketValue: parseFloat(pos.market_value),
        costBasis: parseFloat(pos.cost_basis),
        currentPrice: parseFloat(pos.current_price),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        unrealizedPnl: parseFloat(pos.unrealized_pl),
        unrealizedPnlPercent: parseFloat(pos.unrealized_plpc),
        changeToday: parseFloat(pos.change_today),
      }));

      setPositions(normalized);
    } catch (err) {
      console.error('[useAlpacaPortfolio] error:', err.message);
      setError(err.message || 'Failed to load portfolio positions');
      setPositions([]);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions,
    loading,
    error,
    refresh: fetchPositions,
  };
};

export default useAlpacaPortfolio;
