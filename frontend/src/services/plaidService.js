import api from './api';
import { openLink } from 'react-native-plaid-link-sdk';

export const getLinkToken = async () => {
  const response = await api.post('/plaid/link-token');
  return response.data.link_token || response.data.linkToken;
};

export const exchangePublicToken = async (publicToken) => {
  const response = await api.post('/plaid/exchange-token', {
    public_token: publicToken,
  });
  return response.data;
};

export const openPlaidLink = async (onSuccess, onExit) => {
  try {
    const token = await getLinkToken();

    if (!token) {
      throw new Error('Failed to get link token');
    }

    openLink({
      tokenConfig: {
        token,
        noLoadingState: false,
      },
      onSuccess: async (success) => {
        try {
          await exchangePublicToken(success.publicToken);
          onSuccess && onSuccess(success);
        } catch (err) {
          console.error('[PlaidService] exchange error:', err.message);
          onExit && onExit({ error: err });
        }
      },
      onExit: (exit) => {
        console.log('[PlaidService] user exited:', exit);
        onExit && onExit(exit);
      },
    });
  } catch (err) {
    console.error('[PlaidService] openPlaidLink error:', err.message);
    throw err;
  }
};

export const getTransactions = async (refresh = false) => {
  const url = refresh
    ? '/plaid/transactions?refresh=true'
    : '/plaid/transactions';
  const response = await api.get(url);
  return response.data.transactions || [];
};

export const getBalance = async () => {
  const response = await api.get('/plaid/balance');
  return response.data.accounts || [];
};

export const createProcessorToken = async (accountId, processor) => {
  const response = await api.post('/plaid/processor-token', {
    account_id: accountId,
    processor,
  });
  return response.data.processor_token;
};

export const isBankConnected = async () => {
  try {
    const accounts = await getBalance();
    return accounts.length > 0;
  } catch {
    return false;
  }
};

export default {
  getLinkToken,
  exchangePublicToken,
  openPlaidLink,
  getTransactions,
  getBalance,
  createProcessorToken,
  isBankConnected,
};
