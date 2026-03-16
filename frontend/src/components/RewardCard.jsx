import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const RewardCard = ({
  merchantName,
  merchantEmoji,
  cashbackPercent,
  category,
  minSpend,
  expiryDate,
  isActive,
  isClaimed,
  onClaim,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
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
        style={[styles.card, isActive && styles.activeCard]}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
      >
        <View style={styles.headerRow}>
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{merchantEmoji}</Text>
          </View>
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{cashbackPercent}% back</Text>
          </View>
        </View>

        <Text style={styles.merchantName} numberOfLines={1}>
          {merchantName}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {category}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.minSpend}>Min ₹{minSpend}</Text>
          <Text style={styles.expiry}>{expiryDate}</Text>
        </View>

        {isClaimed ? (
          <View style={styles.claimedBtn}>
            <Text style={styles.claimedText}>Claimed ✓</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={onClaim} disabled={!isActive} activeOpacity={0.9}>
            {isActive ? (
              <LinearGradient
                colors={['#7c6aff', '#9b8aff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBtn}
              >
                <Text style={styles.claimText}>Claim</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveBtn}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: 210,
    backgroundColor: '#17171f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 12,
  },
  activeCard: {
    borderColor: 'rgba(124,106,255,0.5)',
    shadowColor: '#7c6aff',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(124,106,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(78,255,214,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cashbackText: {
    color: '#4effd6',
    fontSize: 11,
    fontFamily: 'SpaceMono-Bold',
  },
  merchantName: {
    color: '#f0efff',
    fontSize: 14,
    fontFamily: 'Syne-Bold',
    marginBottom: 4,
  },
  category: {
    color: '#8884a8',
    fontSize: 11,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  minSpend: {
    color: '#8884a8',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  expiry: {
    color: '#ffd166',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  claimBtn: {
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  claimText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Syne-Bold',
  },
  claimedBtn: {
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#3b384d',
  },
  claimedText: {
    color: '#9f9cb4',
    fontSize: 12,
    fontFamily: 'Syne-Bold',
  },
  inactiveBtn: {
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inactiveText: {
    color: '#8884a8',
    fontSize: 12,
    fontFamily: 'Syne-Bold',
  },
});

export default RewardCard;
