import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// SpenderTypeBadge
//
// Color-coded badge showing AI spender classification.
// ─────────────────────────────────────────────────────────────

const TYPES = {
  low: { label: 'Smart Saver', color: '#4effd6', icon: '🟢', bg: 'rgba(78, 255, 214, 0.10)' },
  moderate: { label: 'Balanced', color: '#ffd166', icon: '🟡', bg: 'rgba(255, 209, 102, 0.10)' },
  high: { label: 'Heavy Spender', color: '#ff6b6b', icon: '🔴', bg: 'rgba(255, 107, 107, 0.10)' },
};

const SpenderTypeBadge = ({ type = 'moderate' }) => {
  const config = TYPES[type] || TYPES.moderate;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color + '30' }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
  },
});

export default SpenderTypeBadge;
