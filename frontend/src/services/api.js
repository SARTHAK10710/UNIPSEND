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
  exchangeToken: (publicToken) => api.post('/api/plaid/exchange-token', { public_token: publicToken }),
};

export const aiAPI = {
  getInsights: () => api.get('/api/ai/insights'),
};

export const investmentAPI = {
  getPortfolio: () => api.get('/api/investments/portfolio'),
  getAccount: () => api.get('/api/investments/account'),
  getMarketPrice: (symbol) => api.get(`/api/investments/market/price/${symbol}`),
  getMarketHistory: (symbol) => api.get(`/api/investments/market/history/${symbol}`),
  searchSymbol: (query) => api.get(`/api/investments/market/search/${query}`),
  getMovers: () => api.get('/api/investments/market/movers'),
  placeOrder: (orderData) => api.post('/api/investments/order', orderData),
  getOrders: () => api.get('/api/investments/orders'),
};

export const subscriptionAPI = {
  initScribeUp: (data) => api.post('/api/subscriptions/scribeup/init', data),
  getRewards: () => api.get('/api/subscriptions/rewards'),
  redeemReward: (data) => api.post('/api/subscriptions/rewards/redeem', data),
};

export const userAPI = {
  getProfile: () => api.get('/api/user/me'),
  updateProfile: (data) => api.put('/api/user/me', data),
  getRiskScore: () => api.get('/api/user/risk-score'),
  updateFcmToken: (token) => api.post('/api/user/fcm-token', { token }),
};

export default api;
