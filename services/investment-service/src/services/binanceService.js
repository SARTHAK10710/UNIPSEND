const { getStockPrice } = require('./alphaVantage');

const getCryptoPrice = async (symbol, redisClient) => {
  try {
    return await getStockPrice(symbol, redisClient);
  } catch (err) {
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: '0%',
      isMock: true,
    };
  }
};

module.exports = { getCryptoPrice };
