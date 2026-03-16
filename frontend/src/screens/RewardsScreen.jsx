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
import { useRewards } from '../hooks/useRewards';

const { width } = Dimensions.get('window');

const OfferCard = ({ title, merchant, discount, icon, color, expiresIn }) => (
  <View style={styles.offerCard}>
    <View style={[styles.offerIconWrap, { backgroundColor: (color || '#7c6aff') + '22' }]}>
      <Text style={styles.offerEmoji}>{icon}</Text>
    </View>
    <Text style={styles.offerMerchant}>{merchant}</Text>
    <Text style={styles.offerTitle}>{title}</Text>
    <View style={styles.offerBadge}>
      <Text style={styles.offerDiscount}>{discount}</Text>
    </View>
    {expiresIn && <Text style={styles.offerExpiry}>Expires in {expiresIn}</Text>}
  </View>
);

const HistoryItem = ({ merchant, date, amount, icon }) => (
  <View style={styles.historyRow}>
    <View style={styles.historyIcon}>
      <Text style={styles.historyEmoji}>{icon}</Text>
    </View>
    <View style={styles.historyInfo}>
      <Text style={styles.historyMerchant}>{merchant}</Text>
      <Text style={styles.historyDate}>{date}</Text>
    </View>
    <Text style={styles.historyAmount}>+₹{amount}</Text>
  </View>
);

const RewardsScreen = () => {
  const {
    totalCashback,
    pendingCashback,
    offers,
    personalizedOffers,
    history,
    loading,
    refreshing,
    onRefresh,
  } = useRewards();

  const renderPersonalizedOffer = ({ item }) => (
    <View style={styles.personalizedCard}>
      <Text style={styles.personalizedIcon}>{item.icon}</Text>
      <Text style={styles.personalizedTitle}>{item.title}</Text>
      <Text style={styles.personalizedDiscount}>{item.discount}</Text>
      <TouchableOpacity style={styles.claimBtn}>
        <Text style={styles.claimText}>Claim</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.headerTitle}>Rewards</Text>
          <TouchableOpacity style={styles.historyBtn}>
            <Text style={styles.historyBtnIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {/* Cashback Hero */}
        <LinearGradient
          colors={['#0d2b2b', '#0a1a2e']}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Total Cashback Earned</Text>
              <Text style={styles.heroAmount}>₹{totalCashback}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>🎁</Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroBottom}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Pending</Text>
              <Text style={styles.heroStatValue}>₹{pendingCashback}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>This Month</Text>
              <Text style={styles.heroStatValue}>₹{Math.floor(totalCashback * 0.2)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Offers Used</Text>
              <Text style={styles.heroStatValue}>{history.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tier Progress */}
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierTitle}>Rewards Tier</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>🥇 Gold</Text>
            </View>
          </View>
          <View style={styles.tierProgress}>
            <View style={styles.tierProgressFill} />
          </View>
          <Text style={styles.tierProgressText}>₹2,500 more to reach Platinum</Text>
        </View>

        {/* Offers Grid */}
        <Text style={styles.sectionTitle}>Available Offers</Text>
        <View style={styles.offersGrid}>
          {offers.map((offer, idx) => (
            <OfferCard key={idx} {...offer} />
          ))}
        </View>

        {/* Personalized Offers */}
        <View style={styles.personalizedHeader}>
          <Text style={styles.personalizedIcon}>✨</Text>
          <Text style={styles.sectionTitle}>Just For You</Text>
        </View>
        <FlatList
          data={personalizedOffers}
          renderItem={renderPersonalizedOffer}
          keyExtractor={(item, idx) => `pers-${idx}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.personalizedList}
        />

        {/* Earned History */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Recent Cashback</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {history.map((item, idx) => (
          <HistoryItem key={idx} {...item} />
        ))}

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
  historyBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#17171f',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  historyBtnIcon: { fontSize: 18 },
  heroCard: {
    borderRadius: 20, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(78, 255, 214, 0.2)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#4effd6', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  heroAmount: { color: '#4effd6', fontSize: 36, fontWeight: '700' },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(78, 255, 214, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIcon: { fontSize: 28 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 18 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStat: { alignItems: 'center' },
  heroStatLabel: { color: '#8884a8', fontSize: 11, marginBottom: 4 },
  heroStatValue: { color: '#f0efff', fontSize: 16, fontWeight: '700' },
  tierCard: {
    backgroundColor: '#17171f', borderRadius: 16, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tierTitle: { color: '#f0efff', fontSize: 15, fontWeight: '600' },
  tierBadge: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  tierBadgeText: { color: '#ffd166', fontSize: 12, fontWeight: '700' },
  tierProgress: { height: 6, backgroundColor: '#2a2a3a', borderRadius: 3, marginBottom: 8 },
  tierProgressFill: { width: '65%', height: 6, backgroundColor: '#ffd166', borderRadius: 3 },
  tierProgressText: { color: '#8884a8', fontSize: 12 },
  sectionTitle: { color: '#f0efff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  offersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  offerCard: {
    width: (width - 50) / 2, backgroundColor: '#17171f', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  offerIconWrap: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  offerEmoji: { fontSize: 22 },
  offerMerchant: { color: '#8884a8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  offerTitle: { color: '#f0efff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  offerBadge: {
    backgroundColor: 'rgba(78, 255, 214, 0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  offerDiscount: { color: '#4effd6', fontSize: 13, fontWeight: '700' },
  offerExpiry: { color: '#8884a8', fontSize: 10, marginTop: 6 },
  personalizedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  personalizedList: { paddingBottom: 20, gap: 10 },
  personalizedCard: {
    width: 160, backgroundColor: '#17171f', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  personalizedIcon: { fontSize: 28, marginBottom: 8 },
  personalizedTitle: { color: '#f0efff', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  personalizedDiscount: { color: '#7c6aff', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  claimBtn: {
    backgroundColor: '#7c6aff', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8,
  },
  claimText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  viewAll: { color: '#7c6aff', fontSize: 14, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#17171f',
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(78, 255, 214, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  historyEmoji: { fontSize: 18 },
  historyInfo: { flex: 1 },
  historyMerchant: { color: '#f0efff', fontSize: 14, fontWeight: '600' },
  historyDate: { color: '#8884a8', fontSize: 11, marginTop: 2 },
  historyAmount: { color: '#4effd6', fontSize: 15, fontWeight: '700' },
});

export default RewardsScreen;
