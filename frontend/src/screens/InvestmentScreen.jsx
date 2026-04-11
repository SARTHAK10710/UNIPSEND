import React, { useState, useMemo } from 'react';
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
import AIPortfolioCard from '../components/AIPortfolioCard';

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
    riskProfile,
    accountLoading,
    holdingsLoading,
    moversLoading,
    orderLoading,
    error,
    placeOrder,
    refresh,
    aiPortfolio,
    aiPortfolioLoading,
    investmentAdvice,
    aiAvailable,
    // New: Alpaca direct + Alpha Vantage
    livePrices,
    fetchMarketData,
    stockData,
    stockIndicator,
    selectedSymbol,
    marketDataLoading,
    clearMarketData,
  } = useInvestment();

  const riskScore = riskProfile?.risk_score || 0;
  const riskLabel = riskProfile?.label || 'Moderate';

  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const handleInvest = async () => {
    if (!orderSymbol || !orderQty) {
      Alert.alert('Error', 'Please enter symbol and quantity');
      return;
    }
    try {
      const parsedQty = parseFloat(orderQty);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        return;
      }

      const result = await placeOrder(orderSymbol, parsedQty, 'buy');
      if (result.success) {
        Alert.alert('Success', `Order placed for ${orderQty} units of ${orderSymbol}`);
        setShowOrderModal(false);
        setOrderSymbol('');
        setOrderQty('');
      } else {
        const errorMsg = result.error;
        if (errorMsg.includes('symbol not found')) {
          Alert.alert('Invalid Symbol', `${orderSymbol} not found. Note: Alpaca Paper trading supports US stocks only (e.g. AAPL, BTC).`);
        } else {
          Alert.alert('Order Failed', errorMsg || 'Failed to place order');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to place order');
    }
  };

  const riskColor = riskScore < 40 ? '#4effd6' : riskScore < 70 ? '#ffd166' : '#ff6b6b';

  // Parse Alpha Vantage stock data for mini chart
  const chartPoints = useMemo(() => {
    if (!stockData?.timeSeries) return [];
    const entries = Object.entries(stockData.timeSeries).slice(0, 7).reverse();
    return entries.map(([date, data]) => ({
      date: date.slice(5), // "01-15"
      close: parseFloat(data['4. close']),
      high: parseFloat(data['2. high']),
      low: parseFloat(data['3. low']),
    }));
  }, [stockData]);

  // Latest RSI value
  const latestRSI = useMemo(() => {
    if (!stockIndicator?.analysis) return null;
    const firstEntry = Object.entries(stockIndicator.analysis)[0];
    return firstEntry ? parseFloat(firstEntry[1].RSI).toFixed(1) : null;
  }, [stockIndicator]);


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
          <Text style={styles.portfolioValue}>{account ? `₹${account.portfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}` : '—'}</Text>
          <View style={styles.returnsRow}>
            <Text style={styles.returnsIcon}>{account?.dayPnl >= 0 ? '📈' : '📉'}</Text>
            <Text style={[styles.returnsText, { color: (account?.dayPnl || 0) >= 0 ? '#4effd6' : '#ff6b6b' }]}>
              {account ? `${account.dayPnl >= 0 ? '+' : ''}₹${Math.abs(account.dayPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </Text>
          </View>
          <Text style={styles.returnsLabel}>TODAY'S RETURNS</Text>
        </LinearGradient>

        {/* Portfolio Breakdown */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>💵 Cash</Text>
              <Text style={styles.breakdownValue}>
                {account ? `₹${(account.cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>📊 Invested</Text>
              <Text style={styles.breakdownValue}>
                {account ? `₹${((account.portfolioValue || 0) - (account.cash || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>🛒 Buying Power</Text>
              <Text style={styles.breakdownValue}>
                {account ? `₹${(account.buyingPower || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>{(account?.totalPnl || 0) >= 0 ? '📈' : '📉'} Total P&L</Text>
              <Text style={[styles.breakdownValue, { color: (account?.totalPnl || 0) >= 0 ? '#4effd6' : '#ff6b6b' }]}>
                {account ? `${(account.totalPnl || 0) >= 0 ? '+' : ''}₹${Math.abs(account.totalPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* AI Portfolio Recommendation */}
        {aiAvailable && aiPortfolio && aiPortfolio.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <AIPortfolioCard portfolio={aiPortfolio} advice={investmentAdvice} />
          </View>
        )}

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
            <TouchableOpacity 
              style={[styles.orderSubmit, { opacity: orderLoading ? 0.6 : 1 }]} 
              onPress={handleInvest}
              disabled={orderLoading}
            >
              <Text style={styles.orderSubmitText}>
                {orderLoading ? 'Processing...' : 'Place Buy Order'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Risk Profile */}
        <View style={styles.riskCard}>
          <Text style={styles.riskTitle}>RISK PROFILE</Text>
          {/* Linear gauge bar */}
          <View style={styles.gaugeBarContainer}>
            <View style={styles.gaugeBarTrack}>
              <LinearGradient
                colors={['#4effd6', '#ffd166', '#ff6b6b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gaugeBarFill, { width: `${Math.max(riskScore, 5)}%` }]}
              />
            </View>
            <View style={[styles.gaugeBarIndicator, { left: `${Math.max(riskScore, 5)}%` }]}>
              <View style={[styles.gaugeBarDot, { backgroundColor: riskColor }]} />
            </View>
          </View>
          <View style={styles.gaugeLabelsRow}>
            <Text style={styles.gaugeLabelMin}>0</Text>
            <Text style={[styles.gaugeScore, { color: riskColor }]}>{riskScore}</Text>
            <Text style={styles.gaugeLabelMax}>100</Text>
          </View>
          <Text style={[styles.riskLabelText, { color: riskColor }]}>{riskLabel}</Text>
          <Text style={styles.riskDescription}>{riskLabel ? `Your risk profile is ${riskLabel}` : ''}</Text>
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

        {/* Top Holdings — with live prices */}
        <View style={styles.holdingsHeader}>
          <Text style={styles.sectionTitle}>Top Holdings</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {holdings.map((holding, idx) => {
          const livePrice = livePrices[holding.symbol];
          const isSelected = selectedSymbol === holding.symbol;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                if (isSelected) {
                  clearMarketData();
                } else {
                  fetchMarketData(holding.symbol);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.holdingRow, isSelected && styles.holdingRowSelected]}>
                <View style={styles.holdingIcon}>
                  <Text style={styles.holdingEmoji}>{holding.icon || '📊'}</Text>
                </View>
                <View style={styles.holdingInfo}>
                  <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                  <Text style={styles.holdingName}>{holding.name}</Text>
                </View>
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingPrice}>
                    ₹{livePrice ? livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : holding.price}
                  </Text>
                  {livePrice && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  )}
                  <Text style={[styles.holdingChange, { color: holding.change >= 0 ? '#4effd6' : '#ff6b6b' }]}>
                    {holding.change >= 0 ? '+' : ''}{holding.change}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Stock Detail Panel (Alpha Vantage) */}
        {selectedSymbol && (
          <View style={styles.stockDetailCard}>
            <View style={styles.stockDetailHeader}>
              <Text style={styles.stockDetailTitle}>📈 {selectedSymbol} Market Data</Text>
              <TouchableOpacity onPress={() => fetchMarketData(selectedSymbol)}>
                <Text style={styles.refreshBtn}>{marketDataLoading ? '⏳' : '🔄'}</Text>
              </TouchableOpacity>
            </View>

            {marketDataLoading ? (
              <Text style={styles.stockDetailLoading}>Loading market data...</Text>
            ) : chartPoints.length > 0 ? (
              <>
                {/* Mini price chart */}
                <View style={styles.miniChart}>
                  {chartPoints.map((pt, i) => {
                    const allCloses = chartPoints.map(p => p.close);
                    const minClose = Math.min(...allCloses);
                    const maxClose = Math.max(...allCloses);
                    const range = maxClose - minClose || 1;
                    const heightPct = ((pt.close - minClose) / range) * 80 + 20;
                    return (
                      <View key={i} style={styles.miniChartCol}>
                        <View style={styles.miniChartBarWrap}>
                          <LinearGradient
                            colors={pt.close >= (chartPoints[i - 1]?.close || pt.close) ? ['#4effd6', '#2dd4a8'] : ['#ff6b6b', '#ff4444']}
                            style={[styles.miniChartBar, { height: `${heightPct}%` }]}
                          />
                        </View>
                        <Text style={styles.miniChartLabel}>{pt.date}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Price stats */}
                <View style={styles.stockStatsRow}>
                  <View style={styles.stockStat}>
                    <Text style={styles.stockStatLabel}>Close</Text>
                    <Text style={styles.stockStatValue}>
                      ₹{chartPoints[chartPoints.length - 1]?.close?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.stockStat}>
                    <Text style={styles.stockStatLabel}>High</Text>
                    <Text style={[styles.stockStatValue, { color: '#4effd6' }]}>
                      ₹{chartPoints[chartPoints.length - 1]?.high?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.stockStat}>
                    <Text style={styles.stockStatLabel}>Low</Text>
                    <Text style={[styles.stockStatValue, { color: '#ff6b6b' }]}>
                      ₹{chartPoints[chartPoints.length - 1]?.low?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {latestRSI && (
                    <View style={styles.stockStat}>
                      <Text style={styles.stockStatLabel}>RSI</Text>
                      <Text style={[styles.stockStatValue, {
                        color: latestRSI > 70 ? '#ff6b6b' : latestRSI < 30 ? '#4effd6' : '#ffd166'
                      }]}>
                        {latestRSI}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.stockDataSource}>Data: Alpha Vantage • Prices: Alpaca</Text>
              </>
            ) : (
              <Text style={styles.stockDetailLoading}>No data available for {selectedSymbol}</Text>
            )}
          </View>
        )}

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
  gaugeBarContainer: {
    width: '100%', height: 28, position: 'relative', marginBottom: 8,
  },
  gaugeBarTrack: {
    width: '100%', height: 12, borderRadius: 6,
    backgroundColor: 'rgba(124, 106, 255, 0.12)', overflow: 'hidden',
    marginTop: 8,
  },
  gaugeBarFill: {
    height: '100%', borderRadius: 6,
  },
  gaugeBarIndicator: {
    position: 'absolute', top: 0, marginLeft: -10,
  },
  gaugeBarDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 3, borderColor: '#0a0a0f',
    elevation: 4,
  },
  gaugeLabelsRow: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  gaugeLabelMin: { color: '#4effd6', fontSize: 11, fontWeight: '600' },
  gaugeLabelMax: { color: '#ff6b6b', fontSize: 11, fontWeight: '600' },
  gaugeScore: { fontSize: 36, fontWeight: '700' },
  riskLabelText: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  riskDescription: { color: '#8884a8', fontSize: 13, textAlign: 'center' },
  breakdownCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  breakdownItem: {
    flex: 1, alignItems: 'center',
  },
  breakdownDivider: {
    width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  breakdownLabel: {
    color: '#8884a8', fontSize: 11, fontWeight: '600', marginBottom: 4,
  },
  breakdownValue: {
    color: '#f0efff', fontSize: 16, fontWeight: '700',
  },
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
  holdingRowSelected: {
    borderColor: '#7c6aff',
    backgroundColor: 'rgba(124, 106, 255, 0.05)',
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
  liveBadge: {
    backgroundColor: 'rgba(78, 255, 214, 0.15)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 2, alignSelf: 'flex-end',
  },
  liveBadgeText: { color: '#4effd6', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  stockDetailCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginTop: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  stockDetailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  stockDetailTitle: { color: '#f0efff', fontSize: 16, fontWeight: '700' },
  refreshBtn: { fontSize: 18 },
  stockDetailLoading: { color: '#8884a8', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  miniChart: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    height: 100, marginBottom: 16,
  },
  miniChartCol: { alignItems: 'center', flex: 1 },
  miniChartBarWrap: { width: 18, height: 80, justifyContent: 'flex-end', alignItems: 'center' },
  miniChartBar: { width: 14, borderRadius: 7, minHeight: 8 },
  miniChartLabel: { color: '#8884a8', fontSize: 9, fontWeight: '600', marginTop: 6 },
  stockStatsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#1e1e28', borderRadius: 12, padding: 14,
  },
  stockStat: { alignItems: 'center' },
  stockStatLabel: { color: '#8884a8', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  stockStatValue: { color: '#f0efff', fontSize: 14, fontWeight: '700' },
  stockDataSource: {
    color: '#4a4660', fontSize: 10, textAlign: 'center', marginTop: 12, fontStyle: 'italic',
  },
});

export default InvestmentScreen;
