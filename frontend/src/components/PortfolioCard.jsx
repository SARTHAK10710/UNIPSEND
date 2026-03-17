import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const PLATFORM_STYLE = {
  alpaca: {
    backgroundColor: 'rgba(124,106,255,0.16)',
    color: '#7c6aff',
  },
  kite: {
    backgroundColor: 'rgba(78,255,214,0.16)',
    color: '#4effd6',
  },
  binance: {
    backgroundColor: 'rgba(255,209,102,0.18)',
    color: '#ffd166',
  },
};

const formatInr = (value) => `₹${Number(value || 0).toFixed(2)}`;

const getTradingInfo = (symbol) => {
  const indianSuffixes = ['.BSE', '.NSE', '.BO', '.NS'];
  const cryptoSymbols = ['BTC', 'ETH', 'DOGE', 'SOL'];
  const indianStocks = ['RELIANCE', 'TCS', 'INFY', 'NIFTYBEES'];
  if (cryptoSymbols.includes(symbol)) {
    return { label: 'Crypto', color: '#ffd166', note: 'Use Binance to trade' };
  }
  if (indianSuffixes.some((s) => symbol.endsWith(s)) || indianStocks.includes(symbol)) {
    return { label: 'NSE/BSE', color: '#4effd6', note: 'Simulated trading only' };
  }
  return { label: 'NYSE/NASDAQ', color: '#7c6aff', note: 'Paper trading on Alpaca' };
};

const PortfolioCard = ({
  symbol,
  companyName,
  quantity,
  avgPrice,
  currentPrice,
  dayChange,
  platform,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const initials = (symbol || '').slice(0, 2).toUpperCase();
  const pnl = (Number(currentPrice) - Number(avgPrice)) * Number(quantity || 0);
  const pnlPositive = pnl >= 0;
  const dayPositive = Number(dayChange) >= 0;
  const platformStyle = PLATFORM_STYLE[platform] || PLATFORM_STYLE.alpaca;

  const dayText = useMemo(() => `${dayPositive ? '▲' : '▼'} ${Math.abs(Number(dayChange || 0)).toFixed(2)}%`, [dayChange, dayPositive]);

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 35,
      bounciness: 5,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
      >
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.middle}>
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.companyName} numberOfLines={1}>
                {companyName}
              </Text>
              <View style={[styles.platformBadge, { backgroundColor: platformStyle.backgroundColor }]}>
                <Text style={[styles.platformText, { color: platformStyle.color }]}>{platform}</Text>
              </View>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.currentPrice}>{formatInr(currentPrice)}</Text>
            <Text style={[styles.dayChange, { color: dayPositive ? '#4effd6' : '#ff6b6b' }]}>{dayText}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.metaText}>Qty: {quantity}</Text>
          <Text style={styles.metaText}>Avg: {formatInr(avgPrice)}</Text>
          <Text style={[styles.pnl, { color: pnlPositive ? '#4effd6' : '#ff6b6b' }]}>
            P&L: {pnlPositive ? '+' : ''}
            {formatInr(pnl)}
          </Text>
        </View>
        <Text style={[styles.tradingNote, { color: getTradingInfo(symbol).color }]}>
          {getTradingInfo(symbol).note}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#17171f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftGroup: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124,106,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#7c6aff',
    fontFamily: 'Syne-Bold',
    fontSize: 14,
  },
  middle: {
    flex: 1,
  },
  symbol: {
    color: '#f0efff',
    fontSize: 15,
    fontFamily: 'Syne-Bold',
  },
  companyName: {
    color: '#8884a8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  platformText: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono-Bold',
  },
  right: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    color: '#f0efff',
    fontSize: 15,
    fontFamily: 'SpaceMono-Bold',
  },
  dayChange: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  metaText: {
    color: '#8884a8',
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
  pnl: {
    fontSize: 12,
    fontFamily: 'SpaceMono-Bold',
  },
  tradingNote: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    marginTop: 6,
    opacity: 0.7,
  },
});

export default PortfolioCard;
