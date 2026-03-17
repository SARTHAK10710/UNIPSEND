import api from './api';

export const getAccount = async () => {
  try {
    const response = await api.get('/api/investments/alpaca/account');
    return response.data;
  } catch (err) {
    console.log('[AlpacaService] getAccount error:', err.message);
    return {
      portfolioValue: 0,
      buyingPower: 0,
      cash: 0,
      dayPnl: 0,
      totalPnl: 0,
    };
  }
};

export const getPortfolio = async () => {
  try {
    const response = await api.get('/api/investments/alpaca/portfolio');
    return response.data.positions || [];
  } catch (err) {
    console.log('[AlpacaService] getPortfolio error:', err.message);
    return [];
  }
};

export const placeOrder = async (symbol, qty, side) => {
  if (!symbol || !qty || !side) {
    throw new Error('symbol, qty, side are required');
  }

  if (!['buy', 'sell'].includes(side)) {
    throw new Error('side must be buy or sell');
  }

  if (qty <= 0) {
    throw new Error('qty must be greater than 0');
  }

  console.log('[AlpacaService] placing order:', { symbol, qty, side });

  const response = await api.post('/api/investments/alpaca/order', {
    symbol,
    qty,
    side,
  });
  return response.data;
};

export const getOrders = async () => {
  try {
    const response = await api.get('/api/investments/alpaca/orders');
    return response.data.orders || [];
  } catch (err) {
    console.log('[AlpacaService] getOrders error:', err.message);
    return [];
  }
};

export const getStockPrice = async (symbol) => {
  try {
    const response = await api.get(`/api/investments/market/price/${symbol}`);
    return response.data;
  } catch (err) {
    console.log('[AlpacaService] getStockPrice error:', err.message);
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: '0%',
      isMock: true,
    };
  }
};

export const getStockHistory = async (symbol) => {
  try {
    const response = await api.get(`/api/investments/market/history/${symbol}`);
    return response.data.history || [];
  } catch (err) {
    console.log('[AlpacaService] getStockHistory error:', err.message);
    return [];
  }
};

export const getMarketMovers = async () => {
  try {
    const response = await api.get('/api/investments/market/movers');
    return response.data.movers || [];
  } catch (err) {
    console.log('[AlpacaService] getMarketMovers error:', err.message);
    return [];
  }
};

export const searchStocks = async (query) => {
  try {
    const response = await api.get(`/api/investments/market/search/${query}`);
    return response.data.results || [];
  } catch (err) {
    console.log('[AlpacaService] searchStocks error:', err.message);
    return [];
  }
};

export const calculateAllocation = (positions) => {
  if (!positions || positions.length === 0) {
    return { equity: 0, indian: 0, crypto: 0, other: 0 };
  }

  const total = positions.reduce(
    (sum, p) => sum + (p.marketValue || 0),
    0
  );

  if (total === 0) {
    return { equity: 0, indian: 0, crypto: 0, other: 0 };
  }

  const cryptoSymbols = ['BTC', 'ETH', 'DOGE', 'SOL', 'ADA'];
  const indianSuffix = ['.BSE', '.NSE', '.BO', '.NS'];

  let cryptoValue = 0;
  let indianValue = 0;
  let equityValue = 0;

  positions.forEach((pos) => {
    const symbol = pos.symbol || '';
    const value = pos.marketValue || 0;

    if (cryptoSymbols.includes(symbol)) {
      cryptoValue += value;
    } else if (indianSuffix.some((s) => symbol.endsWith(s))) {
      indianValue += value;
    } else {
      equityValue += value;
    }
  });

  return {
    equity: Math.round((equityValue / total) * 100),
    indian: Math.round((indianValue / total) * 100),
    crypto: Math.round((cryptoValue / total) * 100),
    other: Math.round(
      ((total - equityValue - indianValue - cryptoValue) / total) * 100
    ),
  };
};

export default {
  getAccount,
  getPortfolio,
  placeOrder,
  getOrders,
  getStockPrice,
  getStockHistory,
  getMarketMovers,
  searchStocks,
  calculateAllocation,
};
