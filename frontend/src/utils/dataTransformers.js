const CATEGORY_MAP = {
  'FOOD_AND_DRINK': { name: 'Food', color: '#7c6aff', icon: '🍽️' },
  'Food & Drink': { name: 'Food', color: '#7c6aff', icon: '🍽️' },
  'TRAVEL': { name: 'Transport', color: '#4effd6', icon: '🚗' },
  'TRANSPORTATION': { name: 'Transport', color: '#4effd6', icon: '🚗' },
  'Transport': { name: 'Transport', color: '#4effd6', icon: '🚗' },
  'ENTERTAINMENT': { name: 'Entertainment', color: '#ffd166', icon: '🎬' },
  'Entertainment': { name: 'Entertainment', color: '#ffd166', icon: '🎬' },
  'SHOPPING': { name: 'Shopping', color: '#ff6b6b', icon: '🛍️' },
  'GENERAL_MERCHANDISE': { name: 'Shopping', color: '#ff6b6b', icon: '🛍️' },
  'Shops': { name: 'Shopping', color: '#ff6b6b', icon: '🛍️' },
  'SERVICE': { name: 'Subscriptions', color: '#c084fc', icon: '📱' },
  'RENT_AND_UTILITIES': { name: 'Subscriptions', color: '#c084fc', icon: '📱' },
  'Subscription': { name: 'Subscriptions', color: '#c084fc', icon: '📱' },
};

const DEFAULT_CATEGORY = { name: 'Others', color: '#888888', icon: '📋' };

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const mapCategory = (plaidCategory) => {
  return CATEGORY_MAP[plaidCategory] || DEFAULT_CATEGORY;
};

export const groupByDay = (transactions) => {
  if (!transactions || transactions.length === 0) return [];

  const dayMap = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const day = date.getDate().toString();
    const amount = Math.abs(tx.amount || 0);
    dayMap[day] = (dayMap[day] || 0) + amount;
  });

  return Object.entries(dayMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([day, amount]) => ({
      day,
      amount: Math.round(amount),
    }));
};

export const groupByCategory = (transactions) => {
  if (!transactions || transactions.length === 0) return [];

  const catMap = {};
  transactions.forEach((tx) => {
    const mapped = mapCategory(tx.category);
    const name = mapped.name;
    if (!catMap[name]) {
      catMap[name] = { name, amount: 0, color: mapped.color, icon: mapped.icon };
    }
    catMap[name].amount += Math.abs(tx.amount || 0);
  });

  const result = Object.values(catMap).sort((a, b) => b.amount - a.amount);
  const total = result.reduce((sum, c) => sum + c.amount, 0);

  return result.map((c) => ({
    ...c,
    amount: Math.round(c.amount),
    percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
  }));
};

export const groupByMerchant = (transactions) => {
  if (!transactions || transactions.length === 0) return [];

  const merchantMap = {};
  transactions.forEach((tx) => {
    const name = tx.merchant_name || tx.name || 'Unknown';
    if (!merchantMap[name]) {
      merchantMap[name] = { name, amount: 0, count: 0 };
    }
    merchantMap[name].amount += Math.abs(tx.amount || 0);
    merchantMap[name].count += 1;
  });

  return Object.values(merchantMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((m) => ({ ...m, amount: Math.round(m.amount) }));
};

export const normalizeByDay = (transactions) => {
  // Build a 28-day array with { value (0-1), day (date number) }
  if (!transactions || transactions.length === 0) {
    return new Array(28).fill(null).map((_, idx) => ({ value: 0, day: idx + 1 }));
  }

  // Group spending by day-of-month
  const dayMap = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const dayNum = date.getDate();
    dayMap[dayNum] = (dayMap[dayNum] || 0) + Math.abs(tx.amount || 0);
  });

  // Determine how many days to show (up to 28, based on the month)
  const dates = transactions.map((tx) => new Date(tx.date));
  const maxDate = dates.length > 0 ? Math.max(...dates.map((d) => d.getDate())) : 28;
  const daysInGrid = Math.max(maxDate, 28);

  const result = [];
  for (let d = 1; d <= daysInGrid; d++) {
    result.push({ value: dayMap[d] || 0, day: d });
  }

  const maxAmount = Math.max(...result.map((r) => r.value), 1);
  return result.map((r) => ({ ...r, value: r.value / maxAmount }));
};

export const filterByMonth = (transactions, month, year) => {
  if (!transactions) return [];
  const now = new Date();
  const targetYear = year || now.getFullYear();

  return transactions.filter((tx) => {
    const date = new Date(tx.date);
    return date.getMonth() === month && date.getFullYear() === targetYear;
  });
};

export const calculateMonthComparison = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { thisMonth: 0, lastMonth: 0, change: 0, direction: 'flat' };
  }

  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisYear = now.getFullYear();
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisMonthTxs = filterByMonth(transactions, thisMonth, thisYear);
  const lastMonthTxs = filterByMonth(transactions, lastMonth, lastYear);

  const thisTotal = thisMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const lastTotal = lastMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

  const change = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;

  return {
    thisMonth: Math.round(thisTotal),
    lastMonth: Math.round(lastTotal),
    change: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
};

export const isRecurring = (transactions, merchantName) => {
  if (!transactions || !merchantName) return false;

  const merchantTxs = transactions.filter(
    (tx) => (tx.merchant_name || tx.name || '') === merchantName
  );

  if (merchantTxs.length < 2) return false;

  const months = new Set();
  merchantTxs.forEach((tx) => {
    const date = new Date(tx.date);
    months.add(`${date.getFullYear()}-${date.getMonth()}`);
  });

  return months.size >= 2;
};

export const groupByDayOfWeek = (transactions) => {
  const dayMap = {};
  DAY_NAMES.forEach((d) => { dayMap[d] = 0; });

  if (transactions && transactions.length > 0) {
    transactions.forEach((tx) => {
      const dayName = DAY_NAMES[new Date(tx.date).getDay()];
      dayMap[dayName] += Math.abs(tx.amount || 0);
    });
  }

  const ordered = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const result = ordered.map((day) => ({
    day,
    amount: Math.round(dayMap[day] || 0),
    isHigh: false,
  }));

  const maxAmount = Math.max(...result.map((d) => d.amount));
  result.forEach((d) => { if (d.amount === maxAmount && maxAmount > 0) d.isHigh = true; });

  return result;
};

export const groupByRecentDays = (transactions, daysToLookBack = 7, baseDate = new Date()) => {
  const result = [];
  
  for (let i = daysToLookBack - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    d.setHours(0, 0, 0, 0);
    
    const dayLabel = DAY_NAMES[d.getDay()];
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const amount = (transactions || [])
      .filter(tx => tx.date && tx.date.startsWith(dateStr)) 
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    result.push({
      day: dayLabel,
      amount: Math.round(amount),
      isHigh: false
    });
  }

  const maxAmount = Math.max(...result.map((d) => d.amount));
  result.forEach((d) => { if (d.amount === maxAmount && maxAmount > 0) d.isHigh = true; });

  return result;
};

export const detectRecurringSubscriptions = (transactions) => {
  if (!transactions || transactions.length === 0) return [];

  const merchantMap = {};
  transactions.forEach((tx) => {
    const name = tx.merchant_name || tx.name;
    if (!name) return;
    if (!merchantMap[name]) merchantMap[name] = [];
    merchantMap[name].push(tx);
  });

  const recurring = [];
  Object.entries(merchantMap).forEach(([name, txs]) => {
    if (isRecurring(transactions, name)) {
      const amounts = txs.map((t) => Math.abs(t.amount || 0));
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const latest = txs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      recurring.push({
        name,
        amount: Math.round(avgAmount),
        renewalDate: latest.date,
        icon: mapCategory(latest.category).icon,
        color: mapCategory(latest.category).color,
      });
    }
  });

  return recurring.sort((a, b) => b.amount - a.amount);
};
