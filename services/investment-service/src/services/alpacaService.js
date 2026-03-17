const Alpaca = require('@alpacahq/alpaca-trade-api');

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY_ID,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});

const getAccount = async () => {
  try {
    const account = await alpaca.getAccount();
    return {
      portfolioValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power),
      cash: parseFloat(account.cash),
      equity: parseFloat(account.equity),
      lastEquity: parseFloat(account.last_equity),
      dayPnl: parseFloat(account.equity) - parseFloat(account.last_equity),
      currency: account.currency,
    };
  } catch (err) {
    console.error('[AlpacaService] getAccount error:', err.message);
    return {
      portfolioValue: 0,
      buyingPower: 0,
      cash: 0,
      equity: 0,
      lastEquity: 0,
      dayPnl: 0,
      currency: 'USD',
    };
  }
};

const getPositions = async () => {
  try {
    const positions = await alpaca.getPositions();
    return positions.map((pos) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      avgEntryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      marketValue: parseFloat(pos.market_value),
      unrealizedPnl: parseFloat(pos.unrealized_pl),
      unrealizedPnlPercent: parseFloat(pos.unrealized_plpc),
      side: pos.side,
    }));
  } catch (err) {
    console.error('[AlpacaService] getPositions error:', err.message);
    return [];
  }
};

const placeOrder = async (symbol, qty, side) => {
  if (!symbol) throw new Error('symbol is required');
  if (!qty || qty <= 0) throw new Error('qty must be greater than 0');
  if (!['buy', 'sell'].includes(side)) throw new Error('side must be buy or sell');

  const order = await alpaca.createOrder({
    symbol,
    qty: parseInt(qty),
    side,
    type: 'market',
    time_in_force: 'gtc',
  });

  return {
    orderId: order.id,
    symbol: order.symbol,
    qty: order.qty,
    side: order.side,
    status: order.status,
    createdAt: order.created_at,
  };
};

const getOrders = async () => {
  try {
    const orders = await alpaca.getOrders({ status: 'all', limit: 20 });
    return orders.map((o) => ({
      orderId: o.id,
      symbol: o.symbol,
      qty: parseFloat(o.qty),
      side: o.side,
      type: o.type,
      status: o.status,
      filledAt: o.filled_at,
      submittedAt: o.submitted_at,
      filledAvgPrice: o.filled_avg_price ? parseFloat(o.filled_avg_price) : null,
    }));
  } catch (err) {
    console.error('[AlpacaService] getOrders error:', err.message);
    return [];
  }
};

module.exports = {
  getAccount,
  getPositions,
  placeOrder,
  getOrders,
};
