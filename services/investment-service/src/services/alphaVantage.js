const axios = require('axios');

const BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_KEY;

const getStockPrice = async (symbol, redisClient) => {
  const cacheKey = `price:${symbol}`;

  if (redisClient) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const response = await axios.get(BASE_URL, {
    params: { function: 'GLOBAL_QUOTE', symbol, apikey: API_KEY },
  });

  const quote = response.data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error('Invalid response from Alpha Vantage');
  }

  const result = {
    symbol,
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: quote['10. change percent'],
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    volume: parseInt(quote['06. volume']),
    latestDay: quote['07. latest trading day'],
  };

  if (redisClient) {
    await redisClient.setex(cacheKey, 300, JSON.stringify(result));
  }

  return result;
};

const getStockHistory = async (symbol, redisClient) => {
  const cacheKey = `history:${symbol}`;

  if (redisClient) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const response = await axios.get(BASE_URL, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'compact',
      apikey: API_KEY,
    },
  });

  const timeSeries = response.data['Time Series (Daily)'];
  if (!timeSeries) return [];

  const result = Object.entries(timeSeries)
    .slice(0, 30)
    .map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
    }))
    .reverse();

  if (redisClient) {
    await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
  }

  return result;
};

const searchSymbol = async (query) => {
  const response = await axios.get(BASE_URL, {
    params: { function: 'SYMBOL_SEARCH', keywords: query, apikey: API_KEY },
  });

  const matches = response.data['bestMatches'] || [];
  return matches.map((m) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
    region: m['4. region'],
    currency: m['8. currency'],
  }));
};

const getMarketMovers = async (redisClient) => {
  const cacheKey = 'movers';

  if (redisClient) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const symbols = ['SPY', 'AAPL', 'MSFT', 'RELIANCE.BSE', 'TCS.BSE', 'BTC'];

  const results = await Promise.allSettled(
    symbols.map((symbol) => getStockPrice(symbol, redisClient))
  );

  const movers = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => {
      const aVal = parseFloat(a.changePercent) || 0;
      const bVal = parseFloat(b.changePercent) || 0;
      return bVal - aVal;
    });

  if (redisClient) {
    await redisClient.setex(cacheKey, 300, JSON.stringify(movers));
  }

  return movers;
};

module.exports = {
  getStockPrice,
  getStockHistory,
  searchSymbol,
  getMarketMovers,
};
