import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// AIPortfolioCard
//
// Displays AI-recommended asset allocation with colored bars.
// ─────────────────────────────────────────────────────────────

const COLORS = ['#7c6aff', '#4effd6', '#ffd166', '#ff6b6b', '#c084fc', '#60a5fa'];

const AIPortfolioCard = ({ portfolio = [], advice = '' }) => {
  if (!portfolio || portfolio.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.aiIcon}>🤖</Text>
        <Text style={styles.title}>AI Portfolio Suggestion</Text>
      </View>

      {portfolio.map((item, idx) => {
        const pct = Math.round((item.allocation || 0) * 100);
        const color = COLORS[idx % COLORS.length];

        return (
          <View key={item.asset || idx} style={styles.row}>
            <View style={styles.assetInfo}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.assetName}>
                {item.name || item.asset}
              </Text>
              <Text style={styles.ticker}>{item.asset}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.pct, { color }]}>{pct}%</Text>
          </View>
        );
      })}

      {advice ? (
        <View style={styles.adviceBox}>
          <Text style={styles.adviceIcon}>💡</Text>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#17171f',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  aiIcon: {
    fontSize: 18,
  },
  title: {
    color: '#f0efff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assetName: {
    color: '#f0efff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  ticker: {
    color: '#8884a8',
    fontSize: 10,
    fontFamily: 'SpaceMono',
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    width: 38,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: 'SpaceMono-Bold',
    fontWeight: '700',
  },
  adviceBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 106, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    gap: 8,
    alignItems: 'flex-start',
  },
  adviceIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  adviceText: {
    color: '#c4b5fd',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});

export default AIPortfolioCard;
