import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { openLink } from 'react-native-plaid-link-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const createLinkToken = () => api.post('/plaid/link-token');
const exchangeToken = (publicToken) =>
  api.post('/plaid/exchange-token', { public_token: publicToken });

const POPULAR_BANKS = [
  { id: 'chase', name: 'Chase', icon: '🏦', color: '#1a73e8' },
  { id: 'boa', name: 'Bank of America', icon: '🔴', color: '#e31837' },
  { id: 'wells', name: 'Wells Fargo', icon: '🟠', color: '#d71e28' },
];

const ConnectBankScreen = ({ navigation }) => {
  const { setHasConnectedBank, setSkippedBank } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleConnectBank = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      console.log('[ConnectBank] fetching link token...');
      const response = await createLinkToken();
      console.log('[ConnectBank] response:', response.data);
      const token = response.data?.link_token || response.data?.linkToken;
      console.log('[ConnectBank] token received:', token);

      if (!token) {
        setErrorMessage('Could not connect. Try again.');
        return;
      }

      console.log('[ConnectBank] opening Plaid Link...');
      openLink({
        tokenConfig: { token, noLoadingState: false },
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
      });
    } catch (err) {
      console.log('[ConnectBank] error:', err.message);
      console.log('[ConnectBank] error response:', err.response?.data);
      if (!err.response) {
        setErrorMessage('Check your connection');
      } else {
        setErrorMessage('Something went wrong, try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaidSuccess = useCallback(
    async (success) => {
      setIsExchanging(true);
      setErrorMessage(null);
      try {
        await exchangeToken(success.publicToken);
        await AsyncStorage.setItem('bankSetupCompleted', 'true');
        setHasConnectedBank(true);
        // AppNavigator will automatically switch to MainTabs
      } catch (err) {
        setIsExchanging(false);
        if (!err.response) {
          setErrorMessage('Check your connection');
        } else {
          setErrorMessage('Something went wrong, try again');
        }
      }
    },
    [setHasConnectedBank]
  );

  const handlePlaidExit = useCallback(
    (exit) => {
      if (exit.error) {
        setErrorMessage('Bank connection cancelled. Please try again.');
      }
    },
    []
  );

  const handleSkip = async () => {
    await AsyncStorage.setItem('bankSetupCompleted', 'true');
    setHasConnectedBank(true);
    // AppNavigator will automatically switch to MainTabs
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Full-screen loading overlay for token exchange */}
      <Modal visible={isExchanging} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7c6aff" />
          <Text style={styles.loadingText}>Connecting your account...</Text>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Unispend</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.shieldContainer}>
            <View style={styles.shieldOuter}>
              <View style={styles.shieldInner}>
                <Text style={styles.shieldIcon}>🛡️</Text>
              </View>
            </View>
          </View>
          <View style={styles.securityBadges}>
            <View style={styles.secBadge}>
              <Text style={styles.secBadgeIcon}>🏛️</Text>
            </View>
            <View style={[styles.secBadge, styles.secBadgeActive]}>
              <Text style={styles.secBadgeIcon}>🔗</Text>
            </View>
            <View style={styles.secBadge}>
              <Text style={styles.secBadgeIcon}>📄</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Connect your bank</Text>
        <View style={styles.securedRow}>
          <Text style={styles.securedIcon}>✅</Text>
          <Text style={styles.securedText}>Secured by Plaid</Text>
        </View>

        {/* Error card */}
        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>POPULAR BANKS</Text>

        {POPULAR_BANKS.map((bank) => (
          <TouchableOpacity
            key={bank.id}
            style={[
              styles.bankRow,
              selectedBank === bank.id && styles.bankRowSelected,
            ]}
            onPress={handleConnectBank}
          >
            <View style={[styles.bankIcon, { backgroundColor: bank.color + '22' }]}>
              <Text style={styles.bankEmoji}>{bank.icon}</Text>
            </View>
            <Text style={styles.bankName}>{bank.name}</Text>
            <Text style={styles.bankArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.searchLink} onPress={handleConnectBank}>
          <Text style={styles.searchLinkText}>Search for your bank</Text>
        </TouchableOpacity>

        <View style={styles.trustBadges}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustLabel}>256-BIT{'\n'}ENCRYPTION</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <Text style={styles.trustLabel}>BANK-LEVEL{'\n'}SECURITY</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnectBank}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#7c6aff', '#9b8aff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.connectGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectText}>Connect Bank Account ⚡</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By connecting your account, you agree to our Terms of Service and Privacy Policy. Your credentials are never stored.
        </Text>

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 24,
  },
  backArrow: {
    color: '#f0efff',
    fontSize: 22,
  },
  headerTitle: {
    color: '#f0efff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: '#17171f',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  shieldContainer: {
    marginBottom: 20,
  },
  shieldOuter: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#1e1e28',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.3)',
  },
  shieldInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#7c6aff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 36,
  },
  securityBadges: {
    flexDirection: 'row',
    gap: 14,
  },
  secBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e1e28',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  secBadgeActive: {
    borderColor: '#7c6aff',
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
  },
  secBadgeIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Syne-Bold',
    color: '#f0efff',
    textAlign: 'center',
    marginBottom: 10,
  },
  securedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  securedIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  securedText: {
    color: '#8884a8',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionLabel: {
    color: '#8884a8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17171f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bankRowSelected: {
    borderColor: '#7c6aff',
    backgroundColor: 'rgba(124, 106, 255, 0.08)',
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bankEmoji: {
    fontSize: 20,
  },
  bankName: {
    flex: 1,
    color: '#f0efff',
    fontSize: 16,
    fontWeight: '600',
  },
  bankArrow: {
    color: '#8884a8',
    fontSize: 24,
    fontWeight: '300',
  },
  searchLink: {
    alignItems: 'center',
    marginVertical: 18,
  },
  searchLinkText: {
    color: '#7c6aff',
    fontSize: 15,
    fontWeight: '600',
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 28,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  trustLabel: {
    color: '#8884a8',
    fontSize: 10,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  connectButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  connectGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  connectText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    color: '#8884a8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: '#7c6aff',
    fontSize: 15,
    fontWeight: '500',
  },
  // Error card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  errorDismiss: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 10,
  },
  // Loading overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 15, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#f0efff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  },
});

export default ConnectBankScreen;
