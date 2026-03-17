const alpacaService = require('../services/alpacaService');
const alphaVantage = require('../services/alphaVantage');

exports.getAccount = async (req, res) => {
  try {
    const account = await alpacaService.getAccount();
    res.json(account);
  } catch (err) {
    console.error('[Alpaca] getAccount error:', err.message);
    res.json({
      portfolioValue: 0,
      buyingPower: 0,
      cash: 0,
      dayPnl: 0,
      message: 'Connect Alpaca account to view portfolio',
    });
  }
};

exports.getPortfolio = async (req, res) => {
  try {
    const positions = await alpacaService.getPositions();

    const enriched = await Promise.allSettled(
      positions.map(async (pos) => {
        try {
          const priceData = await alphaVantage.getStockPrice(pos.symbol, req.redis);
          return {
            ...pos,
            livePrice: priceData.price,
            dayChange: priceData.changePercent,
          };
        } catch {
          return pos;
        }
      })
    );

    const portfolio = enriched
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    res.json({ positions: portfolio });
  } catch (err) {
    console.error('[Alpaca] getPortfolio error:', err.message);
    res.json({ positions: [] });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { symbol, qty, side } = req.body;

    if (!symbol || !qty || !side) {
      return res.status(400).json({
        error: 'symbol, qty, side are required',
      });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        error: 'side must be buy or sell',
      });
    }

    const order = await alpacaService.placeOrder(symbol, qty, side);
    res.json({ success: true, order });
  } catch (err) {
    console.error('[Alpaca] placeOrder error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await alpacaService.getOrders();
    res.json({ orders });
  } catch (err) {
    console.error('[Alpaca] getOrders error:', err.message);
    res.json({ orders: [] });
  }
};
