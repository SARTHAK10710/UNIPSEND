import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const TYPE_COLOR = {
  alert: '#ff6b6b',
  suggestion: '#4effd6',
  insight: '#7c6aff',
  anomaly: '#ffd166',
};

const AIInsightCard = ({
  type = 'insight',
  emoji,
  title,
  description,
  savingAmount,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const accent = TYPE_COLOR[type] || TYPE_COLOR.insight;
  const Container = onPress ? Pressable : View;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Container
        style={styles.card}
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        <View style={[styles.typeBar, { backgroundColor: accent }]} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.description}>{description}</Text>
          {savingAmount ? (
            <View style={styles.savingRow}>
              <Text style={styles.savingLabel}>Potential saving:</Text>
              <Text style={styles.savingAmount}>{savingAmount}</Text>
            </View>
          ) : null}
        </View>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: '#17171f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  typeBar: {
    width: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 10,
  },
  title: {
    color: '#f0efff',
    fontSize: 14,
    fontFamily: 'Syne-Bold',
    flexShrink: 1,
  },
  description: {
    color: '#8884a8',
    fontSize: 13,
    lineHeight: 20,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  savingLabel: {
    color: '#8884a8',
    fontSize: 12,
  },
  savingAmount: {
    color: '#4effd6',
    fontSize: 13,
    fontFamily: 'SpaceMono-Bold',
  },
});

export default AIInsightCard;
