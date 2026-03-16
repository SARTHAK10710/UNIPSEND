import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export const plaidAPI = {
  getTransactions: () => api.get('/api/plaid/transactions'),
  getBalance: () => api.get('/api/plaid/balance'),
  createLinkToken: () => api.post('/api/plaid/link-token'),
  exchangeToken: (publicToken) => api.post('/api/plaid/exchange-token', { publicToken }),
};

export const aiAPI = {
  getInsights: () => api.get('/api/ai/insights'),
};

export const investmentAPI = {
  getPortfolio: () => api.get('/api/investments/portfolio'),
  getMarketPrice: (symbol) => api.get(`/api/investments/market/price/${symbol}`),
  placeOrder: (orderData) => api.post('/api/investments/alpaca/order', orderData),
};

export const subscriptionAPI = {
  initScribeUp: () => api.post('/api/subscriptions/scribeup/init'),
  getRewards: () => api.get('/api/subscriptions/rewards'),
};

export const userAPI = {
  getProfile: () => api.get('/api/user/me'),
  getRiskScore: () => api.get('/api/user/risk-score'),
};

export default api;
