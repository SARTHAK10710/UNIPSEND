import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const zoneForScore = (score) => {
  if (score <= 33) return { label: 'Conservative', color: '#ff6b6b' };
  if (score <= 66) return { label: 'Moderate', color: '#ffd166' };
  return { label: 'Aggressive', color: '#4effd6' };
};

const polarToCartesian = (cx, cy, radius, angleDegrees) => {
  const angle = (Math.PI / 180) * angleDegrees;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
};

const arcPath = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
};

const RiskGauge = ({ score = 0, size = 200, showLabel = true }) => {
  const clampedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [needleScore, setNeedleScore] = useState(0);
  const strokeWidth = Math.max(10, size * 0.08);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;
  const needleLength = radius - strokeWidth * 0.75;

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => setNeedleScore(value));
    Animated.timing(animatedValue, {
      toValue: clampedScore,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animatedValue.removeListener(id);
  }, [animatedValue, clampedScore]);

  const needleDegrees = -90 + (needleScore / 100) * 180;
  const needleRadians = (Math.PI / 180) * needleDegrees;
  const needleX = centerX + needleLength * Math.sin(needleRadians);
  const needleY = centerY - needleLength * Math.cos(needleRadians);

  const zone = useMemo(() => zoneForScore(clampedScore), [clampedScore]);
  const gaugeHeight = size * 0.62;

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={{ width: size, height: gaugeHeight }}>
        <Svg width={size} height={gaugeHeight}>
          <Path d={arcPath(centerX, centerY, radius, -180, 0)} stroke="#1e1e28" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Path d={arcPath(centerX, centerY, radius, -180, -120)} stroke="#ff6b6b" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Path d={arcPath(centerX, centerY, radius, -120, -60)} stroke="#ffd166" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Path d={arcPath(centerX, centerY, radius, -60, 0)} stroke="#4effd6" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Line x1={centerX} y1={centerY} x2={needleX} y2={needleY} stroke="#f0efff" strokeWidth={2} strokeLinecap="round" />
          <Circle cx={centerX} cy={centerY} r={4} fill="#f0efff" />
        </Svg>
        <View style={styles.centerTextWrap}>
          <Text style={styles.scoreText}>{Math.round(clampedScore)}</Text>
          {showLabel ? <Text style={[styles.scoreLabel, { color: zone.color }]}>{zone.label}</Text> : null}
        </View>
      </View>
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: '#ff6b6b' }]}>Low</Text>
        <Text style={[styles.legendText, { color: '#ffd166' }]}>Medium</Text>
        <Text style={[styles.legendText, { color: '#4effd6' }]}>High</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerTextWrap: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreText: {
    color: '#f0efff',
    fontSize: 32,
    fontFamily: 'SpaceMono-Bold',
    lineHeight: 36,
  },
  scoreLabel: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Syne-Bold',
  },
  legendRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
});

export default RiskGauge;
