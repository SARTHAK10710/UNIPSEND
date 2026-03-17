const SMS_PATTERNS = {
  HDFC: [
    {
      regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|deducted)\s*(?:from|via)?\s*(?:A\/c|Ac|account)?\s*[Xx*]+(\d{4})/i,
      type: 'debit',
    },
    {
      regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:credited)\s*(?:to)?\s*(?:A\/c|Ac|account)?\s*[Xx*]+(\d{4})/i,
      type: 'credit',
    },
  ],
  ICICI: [
    {
      regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited)\s*(?:from)?\s*(?:A\/c|account)?\s*[Xx*]+(\d{4})/i,
      type: 'debit',
    },
    {
      regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:credited|received)\s*(?:in|to)?\s*(?:A\/c|account)?\s*[Xx*]+(\d{4})/i,
      type: 'credit',
    },
  ],
  SBI: [
    {
      regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited)\s*(?:from)?\s*(?:A\/c|Acct)?\s*[Xx*]+(\d{4})/i,
      type: 'debit',
    },
    {
      regex: /(?:credited)\s*(?:with)?\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
      type: 'credit',
    },
  ],
  AXIS: [
    {
      regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited)\s*(?:from)?\s*(?:A\/c)?\s*[Xx*]+(\d{4})/i,
      type: 'debit',
    },
    {
      regex: /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:credited)\s*(?:to)?\s*(?:A\/c)?\s*[Xx*]+(\d{4})/i,
      type: 'credit',
    },
  ],
  KOTAK: [
    {
      regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited)\s*(?:from)?\s*[Xx*]+(\d{4})/i,
      type: 'debit',
    },
  ],
  UPI: [
    {
      regex: /(?:debited|deducted|paid|spent)\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
      type: 'debit',
    },
    {
      regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted|paid)/i,
      type: 'debit',
    },
    {
      regex: /(?:credited|received)\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
      type: 'credit',
    },
    {
      regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:credited|received)/i,
      type: 'credit',
    },
  ],
};

const extractMerchant = (smsBody) => {
  const patterns = [
    /(?:at|to|from)\s+([A-Z][A-Za-z\s&.'-]{2,30})/,
    /(?:Info:|Ref:|UPI:)\s*([A-Za-z\s&.'-]{2,30})/,
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/,
  ];

  for (const pattern of patterns) {
    const match = smsBody.match(pattern);
    if (match) {
      return match[1].trim().replace(/\s+/g, ' ').substring(0, 50);
    }
  }
  return 'Unknown Merchant';
};

const extractDate = (smsBody, smsDate) => {
  const datePattern = /(\d{2}[-/]\d{2}[-/]\d{2,4})/;
  const match = smsBody.match(datePattern);

  if (match) {
    const parts = match[1].split(/[-/]/);
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${parts[1]}-${parts[0]}`;
    }
  }

  if (smsDate) {
    return new Date(smsDate).toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
};

const detectBank = (sender, body) => {
  const senderUpper = (sender || '').toUpperCase();
  const bodyUpper = (body || '').toUpperCase();

  if (senderUpper.includes('HDFC') || bodyUpper.includes('HDFC')) return 'HDFC';
  if (senderUpper.includes('ICICI') || bodyUpper.includes('ICICI')) return 'ICICI';
  if (senderUpper.includes('SBI') || bodyUpper.includes('STATE BANK')) return 'SBI';
  if (senderUpper.includes('AXIS') || bodyUpper.includes('AXIS BANK')) return 'AXIS';
  if (senderUpper.includes('KOTAK') || bodyUpper.includes('KOTAK')) return 'KOTAK';
  return 'UPI';
};

export const parseSMS = (smsBody, sender, smsDate) => {
  if (!smsBody) return null;

  const bank = detectBank(sender, smsBody);
  const patterns = SMS_PATTERNS[bank] || SMS_PATTERNS.UPI;

  for (const pattern of patterns) {
    const match = smsBody.match(pattern.regex);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount <= 0) continue;

      return {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: pattern.type === 'debit' ? amount : -amount,
        merchant_name: extractMerchant(smsBody),
        date: extractDate(smsBody, smsDate),
        category: 'GENERAL_MERCHANDISE',
        source: 'sms',
        bank,
        raw: smsBody,
      };
    }
  }

  return null;
};

export const parseBulkSMS = (smsList) => {
  if (!smsList || !Array.isArray(smsList)) return [];

  return smsList
    .map((sms) =>
      parseSMS(sms.body, sms.address || sms.sender, sms.date || sms.timestamp)
    )
    .filter(Boolean)
    .filter((t) => Math.abs(t.amount) > 0);
};

export const isBankSMS = (sender, body) => {
  if (!sender || !body) return false;

  const bankSenders = [
    'HDFC', 'ICICI', 'SBIINB', 'AXISBK',
    'KOTAK', 'INDUSIND', 'YESBNK', 'PNBSMS',
  ];

  const transactionKeywords = [
    'debited', 'credited', 'deducted',
    'transaction', 'UPI', 'NEFT', 'IMPS',
    'INR', 'Rs.', '₹',
  ];

  const senderMatch = bankSenders.some((s) =>
    sender.toUpperCase().includes(s)
  );

  const keywordMatch = transactionKeywords.some((k) =>
    body.toLowerCase().includes(k.toLowerCase())
  );

  return senderMatch || keywordMatch;
};

export const convertToPlaidFormat = (smsTransaction) => {
  if (!smsTransaction) return null;

  return {
    transaction_id: smsTransaction.id,
    merchant_name: smsTransaction.merchant_name,
    amount: smsTransaction.amount,
    category: [smsTransaction.category],
    date: smsTransaction.date,
    account_id: `sms_${smsTransaction.bank}`,
    pending: false,
    source: 'sms',
  };
};
