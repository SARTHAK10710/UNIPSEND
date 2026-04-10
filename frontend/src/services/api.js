import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";

// Use localhost:3000 with adb reverse for emulators, or machine's local IP for physical devices
const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      if (auth.currentUser) {
        // getIdToken() returns the cached token if it hasn't expired,
        // otherwise it refreshes it automatically.
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        await AsyncStorage.setItem("authToken", token); // Sync it just in case
      } else {
        const token = await AsyncStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.error("Token fetch failed:", e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("authToken");
    }
    return Promise.reject(error);
  },
);

export const plaidAPI = {
  getTransactions: () => api.get("/api/plaid/transactions"),
  getBalance: () => api.get("/api/plaid/balance"),
  createLinkToken: () => api.post("/api/plaid/link-token"),
  exchangeToken: (publicToken) =>
    api.post("/api/plaid/exchange-token", { public_token: publicToken }),
};

export const investmentAPI = {
  getAccount: () => api.get("/api/investments/account"),
  getPortfolio: () => api.get("/api/investments/portfolio"),
  getMovers: () => api.get("/api/investments/market/movers"),
  getOrders: () => api.get("/api/investments/orders"),
  getPrice: (symbol) => api.get(`/api/investments/market/price/${symbol}`),
  getHistory: (symbol) => api.get(`/api/investments/market/history/${symbol}`),
  search: (query) => api.get(`/api/investments/market/search/${query}`),
  placeOrder: (data) => api.post("/api/investments/order", data),
};

export const subscriptionAPI = {
  initScribeUp: (data) => api.post("/api/subscriptions/scribeup/init", data),
  getRewards: () => api.get("/api/subscriptions/rewards"),
  redeemReward: (data) => api.post("/api/subscriptions/rewards/redeem", data),
};

export const userAPI = {
  getProfile: () => api.get("/api/user/me"),
  updateProfile: (data) => api.put("/api/user/me", data),
  getRiskScore: () => api.get("/api/user/risk-score"),
  updateFcmToken: (token) => api.post("/api/user/fcm-token", { token }),
};

export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
};

export default api;
