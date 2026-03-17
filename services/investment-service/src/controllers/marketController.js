const alphaVantage = require('../services/alphaVantage');

exports.getPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }
    const data = await alphaVantage.getStockPrice(symbol, req.redis);
    res.json(data);
  } catch (err) {
    console.error('[Market] getPrice error:', err.message);
    res.json({
      symbol: req.params.symbol,
      price: 0,
      change: 0,
      changePercent: '0%',
      isMock: true,
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await alphaVantage.getStockHistory(symbol, req.redis);
    res.json({ symbol, history: data });
  } catch (err) {
    console.error('[Market] getHistory error:', err.message);
    res.json({ symbol: req.params.symbol, history: [] });
  }
};

exports.searchSymbol = async (req, res) => {
  try {
    const { query } = req.params;
    const results = await alphaVantage.searchSymbol(query);
    res.json({ results });
  } catch (err) {
    console.error('[Market] search error:', err.message);
    res.json({ results: [] });
  }
};

exports.getMovers = async (req, res) => {
  try {
    const movers = await alphaVantage.getMarketMovers(req.redis);
    res.json({ movers });
  } catch (err) {
    console.error('[Market] getMovers error:', err.message);
    res.json({ movers: [] });
  }
};
