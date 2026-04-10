import { useState, useCallback, useEffect, useRef } from 'react';
import { plaidAPI } from '../services/api';

// ─────────────────────────────────────────────────────────────
// useTransactions
//
// Shared hook that fetches Plaid transactions + balance once
// and provides them to any consuming screen/hook.
// Avoids duplicate API calls across screens.
// ─────────────────────────────────────────────────────────────

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFetching = useRef(false);

  const fetchTransactions = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useTransactions] fetching data...');

      const [txRes, balRes] = await Promise.allSettled([
        plaidAPI.getTransactions(),
        plaidAPI.getBalance(),
      ]);

      // Transactions
      const txs =
        txRes.status === 'fulfilled'
          ? txRes.value?.data?.transactions || []
          : [];
      setTransactions(txs);

      // Balance
      if (balRes.status === 'fulfilled') {
        const accounts = balRes.value?.data?.accounts || [];
        const totalCurrent = accounts.reduce((sum, acc) => sum + (acc.current || 0), 0);
        const totalAvailable = accounts.reduce((sum, acc) => sum + (acc.available || 0), 0);
        setBalance({ total: totalCurrent, available: totalAvailable, accounts });
      } else {
        setBalance(null);
      }

      console.log(`[useTransactions] loaded: ${txs.length} transactions`);
    } catch (err) {
      console.error('[useTransactions] error:', err.message);
      setError('Failed to load transactions');
      setTransactions([]);
      setBalance(null);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    balance,
    isLoading,
    error,
    refresh: fetchTransactions,
  };
};

export default useTransactions;
