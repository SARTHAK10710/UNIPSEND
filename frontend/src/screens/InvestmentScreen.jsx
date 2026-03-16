import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useInvestment } from '../hooks/useInvestment';

const { width } = Dimensions.get('window');

const HoldingItem = ({ symbol, name, price, change, icon }) => (
  <View style={styles.holdingRow}>
    <View style={styles.holdingIcon}>
      <Text style={styles.holdingEmoji}>{icon || '📊'}</Text>
    </View>
    <View style={styles.holdingInfo}>
      <Text style={styles.holdingSymbol}>{symbol}</Text>
      <Text style={styles.holdingName}>{name}</Text>
    </View>
    <View style={styles.holdingRight}>
      <Text style={styles.holdingPrice}>₹{price}</Text>
      <Text style={[styles.holdingChange, { color: change >= 0 ? '#4effd6' : '#ff6b6b' }]}>
        {change >= 0 ? '+' : ''}{change}%
      </Text>
    </View>
  </View>
);

const MarketMover = ({ symbol, price, change, icon }) => (
  <View style={styles.moverCard}>
    <Text style={styles.moverIcon}>{icon}</Text>
    <Text style={styles.moverSymbol}>{symbol}</Text>
    <Text style={styles.moverPrice}>₹{price}</Text>
    <Text style={[styles.moverChange, { color: change >= 0 ? '#4effd6' : '#ff6b6b' }]}>
      {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
    </Text>
  </View>
);

const InvestmentScreen = () => {
  const {
    account,
    holdings,
    movers,
    orders,
    allocation,
    accountLoading,
    holdingsLoading,
    moversLoading,
    orderLoading,
    error,
    placeOrder,
    refresh,
  } = useInvestment();

  const riskScore = 0;
  const riskLabel = '';

  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const handleInvest = async () => {
    if (!orderSymbol || !orderQty) {
      Alert.alert('Error', 'Please enter symbol and quantity');
      return;
    }
    try {
      const result = await placeOrder(orderSymbol, parseInt(orderQty), 'buy');
      if (result.success) {
        Alert.alert('Success', `Order placed for ${orderQty} shares of ${orderSymbol}`);
        setShowOrderModal(false);
        setOrderSymbol('');
        setOrderQty('');
      } else {
        Alert.alert('Error', result.error || 'Failed to place order');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to place order');
    }
  };

  const riskColor = riskScore < 40 ? '#4effd6' : riskScore < 70 ? '#ffd166' : '#ff6b6b';

  const renderMover = ({ item }) => <MarketMover {...item} />;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor="#7c6aff" colors={['#7c6aff']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.welcomeSmall}>Welcome back,</Text>
              <Text style={styles.userName}>Portfolio</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn}>
              <Text style={styles.headerBtnIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Text style={styles.headerBtnIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {movers?.gainers?.[0] && (
        <View style={styles.tickerRow}>
          <Text style={styles.tickerLabel}>{movers.gainers[0]?.symbol || ''}</Text>
          <Text style={styles.tickerValueGreen}> {movers.gainers[0]?.price || ''} ({movers.gainers[0]?.changePercent || ''})</Text>
          {movers.gainers[1] && <><Text style={styles.tickerLabel}>  {movers.gainers[1]?.symbol || ''}</Text>
          <Text style={styles.tickerValueGreen}> {movers.gainers[1]?.price || ''} ({movers.gainers[1]?.changePercent || ''})</Text></>}
        </View>
        )}

        {/* Portfolio Value */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.portfolioCard}
        >
          <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
          <Text style={styles.portfolioValue}>{account ? `₹${account.portfolioValue?.toLocaleString() || '0'}` : '—'}</Text>
          <View style={styles.returnsRow}>
            <Text style={styles.returnsIcon}>{account?.dayPnl >= 0 ? '📈' : '📉'}</Text>
            <Text style={styles.returnsText}>{account ? `${account.dayPnl >= 0 ? '+' : ''}₹${(account.dayPnl || 0).toLocaleString()}` : '—'}</Text>
          </View>
          <Text style={styles.returnsLabel}>TODAY'S RETURNS</Text>
        </LinearGradient>

        {/* Invest Button */}
        <TouchableOpacity style={styles.investButton} onPress={() => setShowOrderModal(!showOrderModal)}>
          <LinearGradient
            colors={['#7c6aff', '#9b8aff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.investGradient}
          >
            <Text style={styles.investIcon}>💰</Text>
            <Text style={styles.investText}>Invest Today's Savings</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Order */}
        {showOrderModal && (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>Quick Invest</Text>
            <TextInput
              style={styles.orderInput}
              placeholder="Symbol (e.g. RELIANCE)"
              placeholderTextColor="#4a4660"
              value={orderSymbol}
              onChangeText={setOrderSymbol}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.orderInput}
              placeholder="Quantity"
              placeholderTextColor="#4a4660"
              value={orderQty}
              onChangeText={setOrderQty}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.orderSubmit} onPress={handleInvest}>
              <Text style={styles.orderSubmitText}>Place Buy Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Risk Profile */}
        <View style={styles.riskCard}>
          <Text style={styles.riskTitle}>RISK PROFILE</Text>
          <View style={styles.riskGauge}>
            {/* Semicircle gauge */}
            <View style={styles.gaugeOuter}>
              <View style={[styles.gaugeArc, { borderColor: 'rgba(124, 106, 255, 0.2)' }]} />
              <View style={[styles.gaugeFillArc, {
                borderColor: riskColor,
                transform: [{ rotate: `${-90 + (riskScore / 100) * 180}deg` }],
              }]} />
            </View>
            <View style={styles.gaugeCenter}>
              <Text style={[styles.gaugeScore, { color: riskColor }]}>{riskScore}</Text>
            </View>
          </View>
          <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel}</Text>
          <Text style={styles.riskDescription}>{riskLabel ? `Your risk profile is ${riskLabel}` : ''}</Text>
        </View>

        {/* Asset Allocation */}
        <View style={styles.allocationCard}>
          <Text style={styles.allocationTitle}>ASSET ALLOCATION</Text>
          <View style={styles.allocationContent}>
            <View style={styles.allocationDonut}>
              <View style={styles.allocationRing}>
                {allocation.map((a, idx) => (
                  <View
                    key={idx}
                    style={[styles.allocationSegment, {
                      borderColor: a.color,
                      borderWidth: idx === 0 ? 14 : 0,
                    }]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.allocationLegend}>
              {allocation.map((a, idx) => (
                <View key={idx} style={styles.allocLegendItem}>
                  <View style={[styles.allocDot, { backgroundColor: a.color }]} />
                  <Text style={styles.allocName}>{a.name} ({a.percentage}%)</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Market Movers */}
        <Text style={styles.sectionTitle}>Market Movers</Text>
        <FlatList
          data={movers?.gainers ? [...(movers.gainers || []), ...(movers.losers || [])] : []}
          renderItem={renderMover}
          keyExtractor={(item) => item.symbol}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moversList}
        />

        {/* Top Holdings */}
        <View style={styles.holdingsHeader}>
          <Text style={styles.sectionTitle}>Top Holdings</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {holdings.map((holding, idx) => (
          <HoldingItem key={idx} {...holding} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#7c6aff',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  welcomeSmall: { color: '#8884a8', fontSize: 12 },
  userName: { color: '#f0efff', fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#17171f',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  headerBtnIcon: { fontSize: 16 },
  tickerRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingVertical: 6,
  },
  tickerLabel: { color: '#8884a8', fontSize: 11, fontWeight: '600' },
  tickerValueGreen: { color: '#4effd6', fontSize: 11, fontWeight: '700' },
  portfolioCard: {
    borderRadius: 20, padding: 24, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(78, 255, 214, 0.15)',
  },
  portfolioLabel: { color: '#4effd6', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  portfolioValue: { color: '#f0efff', fontSize: 36, fontWeight: '700' },
  portfolioDecimal: { fontSize: 22, color: '#8884a8' },
  returnsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(78, 255, 214, 0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12, alignSelf: 'flex-start',
  },
  returnsIcon: { fontSize: 14, marginRight: 6 },
  returnsText: { color: '#4effd6', fontSize: 14, fontWeight: '700' },
  returnsLabel: { color: '#8884a8', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 6 },
  investButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  investGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16,
  },
  investIcon: { fontSize: 18, marginRight: 8 },
  investText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  orderCard: {
    backgroundColor: '#17171f', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.3)',
  },
  orderTitle: { color: '#f0efff', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  orderInput: {
    backgroundColor: '#1e1e28', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#f0efff', fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  orderSubmit: {
    backgroundColor: '#7c6aff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  orderSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  riskCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 24, marginBottom: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  riskTitle: { color: '#8884a8', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 20 },
  riskGauge: { width: 160, height: 90, position: 'relative', marginBottom: 12 },
  gaugeOuter: { width: 160, height: 80, overflow: 'hidden', position: 'relative' },
  gaugeArc: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 14,
    position: 'absolute', top: 0,
  },
  gaugeFillArc: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 14,
    position: 'absolute', top: 0, borderRightColor: 'transparent', borderBottomColor: 'transparent',
  },
  gaugeCenter: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  gaugeScore: { fontSize: 36, fontWeight: '700' },
  riskLabel: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  riskDescription: { color: '#8884a8', fontSize: 13, textAlign: 'center' },
  allocationCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  allocationTitle: { color: '#8884a8', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 20 },
  allocationContent: { flexDirection: 'row', alignItems: 'center' },
  allocationDonut: { width: 100, height: 100, marginRight: 24 },
  allocationRing: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 14,
    borderColor: '#7c6aff', alignItems: 'center', justifyContent: 'center',
  },
  allocationSegment: { position: 'absolute' },
  allocationLegend: { flex: 1, gap: 10 },
  allocLegendItem: { flexDirection: 'row', alignItems: 'center' },
  allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  allocName: { color: '#f0efff', fontSize: 13, fontWeight: '500' },
  sectionTitle: { color: '#f0efff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  moversList: { paddingBottom: 20, gap: 10 },
  moverCard: {
    backgroundColor: '#17171f', borderRadius: 14, padding: 14, width: 120, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  moverIcon: { fontSize: 22, marginBottom: 6 },
  moverSymbol: { color: '#f0efff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  moverPrice: { color: '#8884a8', fontSize: 12, marginBottom: 4 },
  moverChange: { fontSize: 12, fontWeight: '700' },
  holdingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  viewAll: { color: '#7c6aff', fontSize: 14, fontWeight: '600' },
  holdingRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#17171f', borderRadius: 16,
    padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  holdingIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e1e28',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  holdingEmoji: { fontSize: 20 },
  holdingInfo: { flex: 1 },
  holdingSymbol: { color: '#f0efff', fontSize: 15, fontWeight: '700' },
  holdingName: { color: '#8884a8', fontSize: 12, marginTop: 2 },
  holdingRight: { alignItems: 'flex-end' },
  holdingPrice: { color: '#f0efff', fontSize: 15, fontWeight: '700' },
  holdingChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});

export default InvestmentScreen;
