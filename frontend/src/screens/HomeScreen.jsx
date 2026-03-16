import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useHome } from '../hooks/useHome';

const { width } = Dimensions.get('window');

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const SkeletonBlock = ({ w, h, style }) => (
  <View style={[{ width: w, height: h, backgroundColor: '#1e1e28', borderRadius: 12 }, style]} />
);

const KPICard = ({ title, value, gradient, icon, subValue, subColor }) => (
  <View style={styles.kpiCard}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.kpiGradientStrip}
    />
    <Text style={styles.kpiLabel}>{title}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    {subValue && <Text style={[styles.kpiSub, { color: subColor || '#4effd6' }]}>{subValue}</Text>}
  </View>
);

const CategoryItem = ({ name, amount, icon, color, progress }) => (
  <View style={styles.categoryItem}>
    <View style={styles.categoryLeft}>
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={styles.categoryName}>{name}</Text>
    </View>
    <Text style={[styles.categoryAmount, { fontFamily: 'SpaceMono' }]}>₹{amount}</Text>
    <View style={styles.categoryBarBg}>
      <View style={[styles.categoryBarFill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const TransactionItem = ({ name, date, amount, icon, positive }) => (
  <View style={styles.txRow}>
    <View style={[styles.txIcon, { backgroundColor: positive ? 'rgba(78, 255, 214, 0.1)' : 'rgba(124, 106, 255, 0.1)' }]}>
      <Text style={styles.txEmoji}>{icon}</Text>
    </View>
    <View style={styles.txInfo}>
      <Text style={styles.txName}>{name}</Text>
      <Text style={styles.txDate}>{date}</Text>
    </View>
    <Text style={[styles.txAmount, { color: positive ? '#4effd6' : '#ff6b6b' }]}>
      {positive ? '+' : '-'}₹{amount}
    </Text>
  </View>
);

const InsightCard = ({ title, message, icon }) => (
  <View style={styles.insightCard}>
    <View style={styles.insightIconWrap}>
      <Text style={styles.insightEmoji}>{icon}</Text>
    </View>
    <View style={styles.insightTextWrap}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightMsg}>{message}</Text>
    </View>
    <TouchableOpacity style={styles.insightAction}>
      <Text style={styles.insightActionIcon}>💬</Text>
    </TouchableOpacity>
  </View>
);

const HomeScreen = ({ navigation }) => {
  const {
    userName,
    balance,
    kpis,
    spendingTrend,
    categories,
    transactions,
    insights,
    loading,
    refreshing,
    onRefresh,
  } = useHome();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonBlock w={width - 48} h={120} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonBlock w={(width - 60) / 2} h={100} />
          <SkeletonBlock w={(width - 60) / 2} h={100} />
        </View>
        <SkeletonBlock w={width - 48} h={200} style={{ marginTop: 16 }} />
        <SkeletonBlock w={width - 48} h={160} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const maxSpend = Math.max(...spendingTrend.map((d) => d.amount), 1);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c6aff"
            colors={['#7c6aff']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName?.charAt(0) || 'S'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hey, {userName || 'Sarthak'} 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Balance */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.total || '21,020'}</Text>
          <View style={styles.balanceTrend}>
            <Text style={styles.trendIcon}>📈</Text>
            <Text style={styles.trendText}>+12.5% this month</Text>
          </View>
        </LinearGradient>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, idx) => (
            <KPICard key={idx} {...kpi} />
          ))}
        </View>

        {/* Spending Trend */}
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.sectionTitle}>Spending Trend</Text>
              <Text style={styles.sectionSub}>Last 7 days</Text>
            </View>
            <Text style={styles.trendAvg}>₹740/day</Text>
          </View>
          <View style={styles.barChart}>
            {spendingTrend.map((day, idx) => (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barWrapper}>
                  <LinearGradient
                    colors={day.isHighlight ? ['#7c6aff', '#9b8aff'] : ['#2a2a3a', '#2a2a3a']}
                    style={[
                      styles.bar,
                      { height: `${(day.amount / maxSpend) * 100}%` },
                    ]}
                  />
                  {day.isHighlight && (
                    <View style={styles.barTooltip}>
                      <Text style={styles.barTooltipText}>₹{day.amount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.barLabel, day.isHighlight && styles.barLabelActive]}>
                  {DAYS[idx]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Top Categories</Text>
        <View style={styles.categoriesCard}>
          {categories.map((cat, idx) => (
            <CategoryItem key={idx} {...cat} />
          ))}
        </View>

        {/* AI Insights */}
        <View style={styles.insightsHeader}>
          <Text style={styles.insightsIcon}>✨</Text>
          <Text style={styles.sectionTitle}>AI Insights</Text>
        </View>
        {insights.map((insight, idx) => (
          <InsightCard key={idx} {...insight} />
        ))}

        {/* Recent Transactions */}
        <View style={styles.txHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {transactions.map((tx, idx) => (
          <TransactionItem key={idx} {...tx} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    padding: 24,
    paddingTop: 80,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c6aff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  greeting: {
    color: '#f0efff',
    fontSize: 20,
    fontWeight: '700',
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#17171f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  notifIcon: {
    fontSize: 20,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(78, 255, 214, 0.15)',
  },
  balanceLabel: {
    color: '#4effd6',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  balanceAmount: {
    color: '#f0efff',
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 1,
  },
  balanceTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  trendText: {
    color: '#4effd6',
    fontSize: 13,
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: (width - 50) / 2,
    backgroundColor: '#17171f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  kpiGradientStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  kpiLabel: {
    color: '#8884a8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  kpiValue: {
    color: '#f0efff',
    fontSize: 22,
    fontWeight: '700',
  },
  kpiSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  trendCard: {
    backgroundColor: '#17171f',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#f0efff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    color: '#8884a8',
    fontSize: 12,
  },
  trendAvg: {
    color: '#7c6aff',
    fontSize: 16,
    fontWeight: '700',
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: 20,
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    width: 16,
    borderRadius: 8,
    minHeight: 8,
  },
  barTooltip: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#7c6aff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  barTooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  barLabel: {
    color: '#8884a8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 8,
  },
  barLabelActive: {
    color: '#f0efff',
    fontWeight: '700',
  },
  categoriesCard: {
    backgroundColor: '#17171f',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  categoryName: {
    color: '#f0efff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  categoryAmount: {
    color: '#f0efff',
    fontSize: 15,
    fontWeight: '700',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  categoryBarBg: {
    height: 4,
    backgroundColor: '#2a2a3a',
    borderRadius: 2,
    marginTop: 4,
  },
  categoryBarFill: {
    height: 4,
    borderRadius: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightsIcon: {
    fontSize: 18,
  },
  insightCard: {
    backgroundColor: '#17171f',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  insightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(78, 255, 214, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  insightEmoji: {
    fontSize: 18,
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    color: '#f0efff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  insightMsg: {
    color: '#8884a8',
    fontSize: 12,
    lineHeight: 17,
  },
  insightAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#7c6aff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  insightActionIcon: {
    fontSize: 16,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  seeAll: {
    color: '#7c6aff',
    fontSize: 14,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17171f',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txEmoji: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    color: '#f0efff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  txDate: {
    color: '#8884a8',
    fontSize: 11,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HomeScreen;
