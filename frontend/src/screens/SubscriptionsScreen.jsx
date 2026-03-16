import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSubscriptions } from '../hooks/useSubscriptions';

const { width } = Dimensions.get('window');

const SubscriptionItem = ({ name, amount, renewalDate, icon, color, isForgotten }) => (
  <View style={[styles.subRow, isForgotten && styles.subRowForgotten]}>
    <View style={[styles.subIcon, { backgroundColor: color + '22' }]}>
      <Text style={styles.subEmoji}>{icon}</Text>
    </View>
    <View style={styles.subInfo}>
      <Text style={styles.subName}>{name}</Text>
      <Text style={styles.subDate}>Renews {renewalDate}</Text>
    </View>
    <View style={styles.subRight}>
      <Text style={styles.subAmount}>₹{amount}/mo</Text>
      <View style={styles.subActions}>
        <TouchableOpacity style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const SubscriptionsScreen = () => {
  const {
    totalMonthly,
    activeSubscriptions,
    forgottenSubscriptions,
    scribeUpUrl,
    loading,
    refreshing,
    onRefresh,
  } = useSubscriptions();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c6aff" colors={['#7c6aff']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Total Monthly */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.totalCard}
        >
          <Text style={styles.totalLabel}>Monthly Subscription Cost</Text>
          <Text style={styles.totalAmount}>₹{totalMonthly}</Text>
          <View style={styles.totalChange}>
            <Text style={styles.changeIcon}>📊</Text>
            <Text style={styles.changeText}>5 active subscriptions</Text>
          </View>
        </LinearGradient>

        {/* Subscription Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          <View style={styles.breakdownBar}>
            {activeSubscriptions.map((sub, idx) => (
              <View
                key={idx}
                style={[styles.breakdownSegment, {
                  backgroundColor: sub.color || '#7c6aff',
                  flex: sub.amount,
                }]}
              />
            ))}
          </View>
          <View style={styles.breakdownLegend}>
            {activeSubscriptions.map((sub, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: sub.color || '#7c6aff' }]} />
                <Text style={styles.legendName}>{sub.name}</Text>
                <Text style={styles.legendAmount}>₹{sub.amount}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Subscriptions */}
        <Text style={styles.sectionTitle}>Active Subscriptions</Text>
        {activeSubscriptions.map((sub, idx) => (
          <SubscriptionItem key={idx} {...sub} />
        ))}

        {/* Forgotten Subscriptions */}
        {forgottenSubscriptions.length > 0 && (
          <>
            <View style={styles.forgottenHeader}>
              <Text style={styles.forgottenIcon}>⚠️</Text>
              <Text style={styles.forgottenTitle}>Forgotten Subscriptions</Text>
            </View>
            <Text style={styles.forgottenSub}>
              These subscriptions haven't been used in over 30 days
            </Text>
            {forgottenSubscriptions.map((sub, idx) => (
              <SubscriptionItem key={idx} {...sub} isForgotten />
            ))}
          </>
        )}

        {/* ScribeUp Integration */}
        <View style={styles.scribeUpCard}>
          <View style={styles.scribeUpHeader}>
            <Text style={styles.scribeUpIcon}>🔄</Text>
            <View>
              <Text style={styles.scribeUpTitle}>ScribeUp Scanner</Text>
              <Text style={styles.scribeUpSub}>Automatically detect all subscriptions</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scribeUpBtn}>
            <LinearGradient
              colors={['#7c6aff', '#9b8aff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scribeUpGradient}
            >
              <Text style={styles.scribeUpBtnText}>Scan My Subscriptions</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💸</Text>
            <Text style={styles.statValue}>₹{(totalMonthly * 12).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Yearly Cost</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔴</Text>
            <Text style={[styles.statValue, { color: '#ff6b6b' }]}>{forgottenSubscriptions.length}</Text>
            <Text style={styles.statLabel}>Unused</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={[styles.statValue, { color: '#4effd6' }]}>
              ₹{forgottenSubscriptions.reduce((sum, s) => sum + s.amount, 0)}
            </Text>
            <Text style={styles.statLabel}>Can Save</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  headerTitle: { color: '#f0efff', fontSize: 24, fontWeight: '700' },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c6aff',
    alignItems: 'center', justifyContent: 'center',
  },
  addIcon: { color: '#fff', fontSize: 22, fontWeight: '300' },
  totalCard: {
    borderRadius: 20, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  totalLabel: { color: '#8884a8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  totalAmount: { color: '#f0efff', fontSize: 36, fontWeight: '700' },
  totalChange: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  changeIcon: { fontSize: 14, marginRight: 6 },
  changeText: { color: '#4effd6', fontSize: 13, fontWeight: '500' },
  breakdownCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { color: '#f0efff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  breakdownBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: 16 },
  breakdownSegment: { borderRadius: 4 },
  breakdownLegend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendName: { color: '#f0efff', fontSize: 13, flex: 1 },
  legendAmount: { color: '#8884a8', fontSize: 13, fontWeight: '600' },
  subRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#17171f',
    borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  subRowForgotten: { borderColor: 'rgba(255, 107, 107, 0.4)', backgroundColor: 'rgba(255, 107, 107, 0.05)' },
  subIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  subEmoji: { fontSize: 20 },
  subInfo: { flex: 1 },
  subName: { color: '#f0efff', fontSize: 15, fontWeight: '600' },
  subDate: { color: '#8884a8', fontSize: 12, marginTop: 2 },
  subRight: { alignItems: 'flex-end' },
  subAmount: { color: '#f0efff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  subActions: { flexDirection: 'row' },
  manageBtn: {
    backgroundColor: 'rgba(124, 106, 255, 0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  manageBtnText: { color: '#7c6aff', fontSize: 11, fontWeight: '600' },
  forgottenHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6, gap: 8 },
  forgottenIcon: { fontSize: 18 },
  forgottenTitle: { color: '#ff6b6b', fontSize: 18, fontWeight: '700' },
  forgottenSub: { color: '#8884a8', fontSize: 13, marginBottom: 14 },
  scribeUpCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginTop: 10, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  scribeUpHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  scribeUpIcon: { fontSize: 28 },
  scribeUpTitle: { color: '#f0efff', fontSize: 16, fontWeight: '700' },
  scribeUpSub: { color: '#8884a8', fontSize: 12 },
  scribeUpBtn: { borderRadius: 14, overflow: 'hidden' },
  scribeUpGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  scribeUpBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: '#17171f', borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statValue: { color: '#f0efff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: '#8884a8', fontSize: 11, fontWeight: '500' },
});

export default SubscriptionsScreen;
