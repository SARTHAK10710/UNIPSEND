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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSpending } from '../hooks/useSpending';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SpendingScreen = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    totalSpent,
    dailyData,
    categoryBreakdown,
    topMerchants,
    suggestions,
    heatmapData,
    monthComparison,
    loading,
    refreshing,
    onRefresh,
    topSpendingCategory,
    aiSpendingTrend,
    aiLoading,
    aiAvailable,
  } = useSpending();

  const maxDaily = Math.max(...dailyData.map((d) => d.amount), 1);

  const renderMonthPill = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.monthPill, selectedMonth === index && styles.monthPillActive]}
      onPress={() => setSelectedMonth(index)}
    >
      <Text style={[styles.monthText, selectedMonth === index && styles.monthTextActive]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }) => (
    <View style={styles.suggestionCard}>
      <Text style={styles.suggestionIcon}>{item.icon || '🤖'}</Text>
      <Text style={styles.suggestionTitle}>{item.title || item.text}</Text>
      {item.message ? <Text style={styles.suggestionMsg}>{item.message}</Text> : null}
      {item.savings ? (
        <View style={styles.suggestionSavings}>
          <Text style={styles.suggestionSavingsText}>Save ₹{item.savings}</Text>
        </View>
      ) : null}
    </View>
  );

  const donutSegments = categoryBreakdown.map((cat, idx) => {
    const total = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0) || 1;
    const pct = (cat.amount / total) * 100;
    return { ...cat, percentage: pct };
  });

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
          <Text style={styles.headerTitle}>Spending Manager</Text>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        <FlatList
          data={MONTHS}
          renderItem={renderMonthPill}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthList}
        />

        {/* Total Spent Card */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.totalCard}
        >
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>₹{totalSpent}</Text>
          <View style={styles.totalTrend}>
            <Text style={styles.totalTrendText}>{monthComparison ? `${monthComparison.direction === 'up' ? '📈' : '📉'} ${monthComparison.direction === 'up' ? '+' : '-'}${monthComparison.change}% vs last month` : ''}</Text>
          </View>
        </LinearGradient>

        {/* Category Donut */}
        <View style={styles.donutCard}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.donutContainer}>
            <View style={styles.donutVisual}>
              <View style={styles.donutOuter}>
                <View style={styles.donutInner}>
                  <Text style={styles.donutTotal}>₹{totalSpent}</Text>
                  <Text style={styles.donutSubtext}>Total</Text>
                </View>
              </View>
              {/* Simulated donut ring segments */}
              {donutSegments.map((seg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.donutSegmentIndicator,
                    {
                      backgroundColor: seg.color,
                      top: 10 + idx * 5,
                      left: idx % 2 === 0 ? -4 : undefined,
                      right: idx % 2 !== 0 ? -4 : undefined,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.donutLegend}>
              {donutSegments.map((seg, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.legendName}>{seg.name}</Text>
                  <Text style={styles.legendPct}>{seg.percentage.toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Daily Spending Bar Chart */}
        <View style={styles.dailyCard}>
          <Text style={styles.sectionTitle}>Daily Spending</Text>
          <View style={styles.barChart}>
            {dailyData.slice(0, 7).map((day, idx) => (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barWrap}>
                  <LinearGradient
                    colors={day.isHigh ? ['#ff6b6b', '#ff8e8e'] : ['#7c6aff', '#9b8aff']}
                    style={[styles.bar, { height: `${(day.amount / maxDaily) * 100}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{day.day}</Text>
                <Text style={styles.barAmount}>₹{day.amount}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spending Heatmap */}
        <View style={styles.heatmapCard}>
          <Text style={styles.sectionTitle}>Spending Heatmap</Text>
          <Text style={styles.heatmapSub}>Darker = more spending</Text>
          <View style={styles.heatmapGrid}>
            {heatmapData.map((val, idx) => (
              <View
                key={idx}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor:
                      val === 0
                        ? '#1e1e28'
                        : val < 500
                        ? 'rgba(124, 106, 255, 0.2)'
                        : val < 1000
                        ? 'rgba(124, 106, 255, 0.4)'
                        : val < 2000
                        ? 'rgba(124, 106, 255, 0.6)'
                        : '#7c6aff',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* AI Suggestions */}
        <View style={styles.suggestionsHeader}>
          <Text style={styles.suggestionsIcon}>🤖</Text>
          <Text style={styles.sectionTitle}>AI Suggestions</Text>
        </View>
        <FlatList
          data={suggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item, idx) => `sug-${idx}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsList}
          scrollEnabled
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
  },
  headerTitle: { color: '#f0efff', fontSize: 24, fontWeight: '700' },
  filterBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#17171f',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  filterIcon: { fontSize: 18 },
  monthList: { paddingBottom: 16, gap: 8 },
  monthPill: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#17171f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  monthPillActive: { backgroundColor: '#7c6aff', borderColor: '#7c6aff' },
  monthText: { color: '#8884a8', fontSize: 13, fontWeight: '600' },
  monthTextActive: { color: '#fff' },
  totalCard: {
    borderRadius: 20, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  totalLabel: { color: '#8884a8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  totalAmount: { color: '#f0efff', fontSize: 36, fontWeight: '700' },
  totalTrend: { marginTop: 8 },
  totalTrendText: { color: '#4effd6', fontSize: 13, fontWeight: '500' },
  donutCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { color: '#f0efff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  donutContainer: { flexDirection: 'row', alignItems: 'center' },
  donutVisual: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutOuter: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 12,
    borderColor: '#7c6aff', alignItems: 'center', justifyContent: 'center',
  },
  donutInner: { alignItems: 'center' },
  donutTotal: { color: '#f0efff', fontSize: 16, fontWeight: '700' },
  donutSubtext: { color: '#8884a8', fontSize: 10 },
  donutSegmentIndicator: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
  },
  donutLegend: { flex: 1, marginLeft: 24, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendName: { color: '#f0efff', fontSize: 13, flex: 1 },
  legendPct: { color: '#8884a8', fontSize: 13, fontWeight: '600' },
  dailyCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barCol: { alignItems: 'center', flex: 1 },
  barWrap: { width: 18, height: 110, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 9, minHeight: 6 },
  barLabel: { color: '#8884a8', fontSize: 10, fontWeight: '600', marginTop: 6 },
  barAmount: { color: '#8884a8', fontSize: 8, marginTop: 2 },
  heatmapCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heatmapSub: { color: '#8884a8', fontSize: 12, marginTop: -10, marginBottom: 14 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell: { width: (width - 100) / 7, height: 20, borderRadius: 4 },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  suggestionsIcon: { fontSize: 18 },
  suggestionsList: { paddingBottom: 8, gap: 12 },
  suggestionCard: {
    width: 200, backgroundColor: '#17171f', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  suggestionIcon: { fontSize: 24, marginBottom: 10 },
  suggestionTitle: { color: '#f0efff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  suggestionMsg: { color: '#8884a8', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  suggestionSavings: {
    backgroundColor: 'rgba(78, 255, 214, 0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  suggestionSavingsText: { color: '#4effd6', fontSize: 12, fontWeight: '700' },
});

export default SpendingScreen;
