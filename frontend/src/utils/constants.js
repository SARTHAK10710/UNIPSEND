import { Platform } from 'react-native';

// API
export const API_BASE_URL = (() => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }
  return 'https://your-production-url.com/api';
})();

export const AI_BASE_URL = 'https://unispend-ai.onrender.com';

// Plaid
export const PLAID_ENV = 'sandbox';
export const PLAID_SANDBOX_INSTITUTION = 'ins_109508';
export const PLAID_SANDBOX_USERNAME = 'user_good';
export const PLAID_SANDBOX_PASSWORD = 'pass_good';

// Colors (match design system exactly)
export const COLORS = {
  bgPrimary: '#0a0a0f',
  bgCard: '#17171f',
  bgElevated: '#1e1e28',

  purple: '#7c6aff',
  cyan: '#4effd6',
  red: '#ff6b6b',
  amber: '#ffd166',
  pink: '#c084fc',

  textPrimary: '#f0efff',
  textMuted: '#8884a8',

  border: 'rgba(255,255,255,0.07)',
  borderActive: 'rgba(124,106,255,0.5)',
};

// Category config
export const CATEGORIES = [
  {
    key: 'food',
    label: 'Food & Dining',
    color: '#7c6aff',
    icon: '🍕',
    plaidKeys: [
      'FOOD_AND_DRINK',
      'RESTAURANTS',
      'FOOD',
      'Food and Drink',
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    color: '#4effd6',
    icon: '🚇',
    plaidKeys: [
      'TRANSPORTATION',
      'TRAVEL',
      'Travel',
      'Transportation',
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    color: '#ffd166',
    icon: '🎮',
    plaidKeys: [
      'ENTERTAINMENT',
      'RECREATION',
      'Recreation',
      'Entertainment',
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    color: '#ff6b6b',
    icon: '🛍️',
    plaidKeys: [
      'SHOPS',
      'GENERAL_MERCHANDISE',
      'Shops',
      'Shopping',
    ],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    color: '#c084fc',
    icon: '📱',
    plaidKeys: [
      'SUBSCRIPTION',
      'SERVICE',
      'Service',
      'Subscription',
    ],
  },
  {
    key: 'others',
    label: 'Others',
    color: '#888888',
    icon: '💰',
    plaidKeys: [],
  },
];

// Risk levels
export const RISK_LEVELS = {
  conservative: {
    label: 'Conservative',
    color: '#ff6b6b',
    range: [0, 33],
    description: 'You prefer safe investments',
    allocation: {
      equity: 20,
      debt: 50,
      gold: 20,
      crypto: 10,
    },
  },
  moderate: {
    label: 'Moderate',
    color: '#ffd166',
    range: [34, 66],
    description: 'You balance risk and reward',
    allocation: {
      equity: 50,
      debt: 30,
      gold: 15,
      crypto: 5,
    },
  },
  aggressive: {
    label: 'Aggressive',
    color: '#4effd6',
    range: [67, 100],
    description: 'You chase high returns',
    allocation: {
      equity: 70,
      debt: 10,
      gold: 10,
      crypto: 10,
    },
  },
};

// Reward tiers
export const REWARD_TIERS = [
  {
    name: 'Bronze',
    icon: '🥉',
    min: 0,
    max: 500,
    color: '#cd7f32',
  },
  {
    name: 'Silver',
    icon: '🥈',
    min: 500,
    max: 1500,
    color: '#c0c0c0',
  },
  {
    name: 'Gold',
    icon: '🥇',
    min: 1500,
    max: 3000,
    color: '#ffd166',
  },
  {
    name: 'Platinum',
    icon: '💎',
    min: 3000,
    max: Infinity,
    color: '#4effd6',
  },
];

// Emergency fund multiplier
export const EMERGENCY_FUND_MONTHS = 6;

// Market symbols to track
export const TRACKED_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf' },
  { symbol: 'AAPL', name: 'Apple', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
  { symbol: 'RELIANCE.BSE', name: 'Reliance', type: 'stock' },
  { symbol: 'TCS.BSE', name: 'TCS', type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
];

// Spender type labels
export const SPENDER_TYPES = {
  saver: {
    label: 'Smart Saver',
    icon: '🟢',
    color: '#4effd6',
  },
  moderate: {
    label: 'Balanced Spender',
    icon: '🟡',
    color: '#ffd166',
  },
  heavy: {
    label: 'Heavy Spender',
    icon: '🔴',
    color: '#ff6b6b',
  },
};

// Navigation screens
export const SCREENS = {
  splash: 'Splash',
  auth: 'Auth',
  connectBank: 'ConnectBank',
  home: 'Home',
  spending: 'Spending',
  investment: 'Investment',
  rewards: 'Rewards',
  subscriptions: 'Subscriptions',
  profile: 'Profile',
  stockDetail: 'StockDetail',
};
