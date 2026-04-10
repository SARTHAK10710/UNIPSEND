import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────
// HealthScoreBadge
//
// Compact circular badge showing financial health score (0-100).
// Color-coded: red (0-40) → yellow (40-70) → green (70-100).
// ─────────────────────────────────────────────────────────────

const getScoreColor = (score) => {
  if (score >= 70) return '#4effd6';
  if (score >= 40) return '#ffd166';
  return '#ff6b6b';
};

const getScoreLabel = (score) => {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
};

const HealthScoreBadge = ({ score = 50, size = 'normal' }) => {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const isCompact = size === 'compact';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View
        style={[
          styles.circle,
          isCompact && styles.circleCompact,
          { borderColor: color },
        ]}
      >
        <Text style={[styles.score, isCompact && styles.scoreCompact, { color }]}>
          {Math.round(score)}
        </Text>
      </View>
      {!isCompact && (
        <View style={styles.labelContainer}>
          <Text style={styles.title}>Health Score</Text>
          <Text style={[styles.label, { color }]}>{label}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  containerCompact: {
    gap: 0,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  circleCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
  },
  score: {
    fontSize: 18,
    fontFamily: 'SpaceMono-Bold',
    fontWeight: '700',
  },
  scoreCompact: {
    fontSize: 13,
  },
  labelContainer: {
    gap: 2,
  },
  title: {
    color: '#8884a8',
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
  },
});

export default HealthScoreBadge;
