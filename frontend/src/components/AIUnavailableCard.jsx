import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────────────
// AIUnavailableCard
//
// Graceful fallback when the AI API is unreachable.
// Shows a retry button.
// ─────────────────────────────────────────────────────────────

const AIUnavailableCard = ({ onRetry }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconRow}>
        <Text style={styles.icon}>🤖</Text>
        <View style={styles.offlineDot} />
      </View>
      <Text style={styles.title}>AI Insights Unavailable</Text>
      <Text style={styles.description}>
        The AI service is warming up. This usually takes about 30 seconds.
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#17171f',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconRow: {
    position: 'relative',
    marginBottom: 10,
  },
  icon: {
    fontSize: 32,
  },
  offlineDot: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
    borderWidth: 2,
    borderColor: '#17171f',
  },
  title: {
    color: '#f0efff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
    marginBottom: 6,
  },
  description: {
    color: '#8884a8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryButton: {
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.3)',
  },
  retryText: {
    color: '#7c6aff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AIUnavailableCard;
