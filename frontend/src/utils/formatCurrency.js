export const formatCurrency = (amount, currency = '₹') => {
  if (amount === null || amount === undefined) return `${currency}0`;
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return `${currency}0`;
  return `${currency}${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const formatCurrencyDecimal = (amount, currency = '₹') => {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return `${currency}0.00`;
  return `${currency}${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercent = (value) => {
  if (value === null || value === undefined) return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
};
