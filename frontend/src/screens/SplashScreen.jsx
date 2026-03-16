import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '🏦',
    badge1: '🏛️',
    badge2: '🔗',
    badge3: '📄',
    title: 'Connect your bank\naccounts ',
    titleHighlight: 'securely',
    description:
      'Unispend uses military-grade encryption to link your accounts and provides a complete view of your finances.',
  },
  {
    id: '2',
    icon: '🤖',
    badge1: '📊',
    badge2: '🔍',
    badge3: '💡',
    title: 'Smart AI ',
    titleHighlight: 'tracking',
    titleSuffix: ' for\nyour expenses',
    description:
      'Our AI automatically categorizes every transaction, helping you identify spending patterns instantly.',
  },
  {
    id: '3',
    icon: '📈',
    badge1: '💰',
    badge2: '📊',
    badge3: '🚀',
    title: 'Grow your ',
    titleHighlight: 'wealth',
    titleSuffix: '\nautomatically',
    description:
      'Get personalized insights and investment recommendations to help your money work harder for you.',
  },
];

const SplashScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToAuth = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Auth');
  };

  const handleSkip = () => {
    goToAuth();
  };

  const renderSlide = ({ item, index }) => (
    <View style={styles.slide}>

      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationBox}>
          <View style={styles.iconCircle}>
            <Text style={styles.mainIcon}>{item.icon}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>{item.badge1}</Text>
          </View>
          <View style={[styles.badge, styles.badgeActive]}>
            <Text style={styles.badgeIcon}>{item.badge2}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>{item.badge3}</Text>
          </View>
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {item.title}
          <Text style={styles.titleAccent}>{item.titleHighlight}</Text>
          {item.titleSuffix || ''}
        </Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={styles.dotsContainer}>
        {SLIDES.map((slide, i) => (
          <TouchableOpacity
            key={slide.id}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: i });
            }}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {index === SLIDES.length - 1 && (
        <TouchableOpacity style={styles.continueButton} onPress={goToAuth}>
          <LinearGradient
            colors={['#7c6aff', '#9b8aff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {index === SLIDES.length - 1 && (
        <TouchableOpacity onPress={goToAuth} style={styles.loginLink}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginHighlight}>Log in</Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {currentIndex === 0 && (
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💎</Text>
          </View>
          <Text style={styles.logoText}>Unispend</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={32}
      />

      <View style={styles.globalNav} pointerEvents="box-none">
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
            }}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#17171f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.3)',
  },
  logoEmoji: {
    fontSize: 28,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f0efff',
    letterSpacing: 1,
  },
  slide: {
    width: width,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingTop: 100,
  },
  globalNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 55,
    right: 24,
    zIndex: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 55,
    left: 24,
    zIndex: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  illustrationBox: {
    width: width * 0.65,
    height: width * 0.5,
    backgroundColor: '#17171f',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#1e1e28',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.4)',
  },
  mainIcon: {
    fontSize: 42,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#17171f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeActive: {
    borderColor: '#7c6aff',
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
  },
  badgeIcon: {
    fontSize: 18,
  },
  textContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#f0efff',
    lineHeight: 40,
    marginBottom: 14,
  },
  titleAccent: {
    color: '#7c6aff',
  },
  description: {
    fontSize: 15,
    color: '#8884a8',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#7c6aff',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#8884a8',
  },
  continueButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  continueText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: '#8884a8',
    fontSize: 14,
  },
  loginHighlight: {
    color: '#7c6aff',
    fontWeight: '600',
  },
});

export default SplashScreen;
