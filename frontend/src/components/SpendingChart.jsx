import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const SpendingChart = ({ data = [], labels = [] }) => {
  const defaultData = [45, 30, 60, 40, 85, 50, 35];
  const defaultLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const chartData = data.length > 0 ? data : defaultData;
  const chartLabels = labels.length > 0 ? labels : defaultLabels;

  const average = useMemo(() => {
    const sum = chartData.reduce((a, b) => a + b, 0);
    return sum / chartData.length;
  }, [chartData]);

  const barColors = useMemo(
    () => chartData.map((val) => (val > average ? '#ff6b6b' : '#7c6aff')),
    [chartData, average]
  );

  const chartConfig = {
    backgroundGradientFrom: 'transparent',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: 'transparent',
    backgroundGradientToOpacity: 0,
    color: () => '#7c6aff',
    labelColor: () => '#8884a8',
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke: 'rgba(255,255,255,0.05)',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontFamily: 'SpaceMono',
      fontSize: 11,
    },
  };

  return (
    <View style={styles.container}>
      <BarChart
        data={{
          labels: chartLabels,
          datasets: [
            {
              data: chartData,
              colors: barColors.map((c) => () => c),
            },
          ],
        }}
        width={screenWidth - 48}
        height={200}
        chartConfig={chartConfig}
        withInnerLines={true}
        withHorizontalLabels={true}
        showBarTops={false}
        fromZero
        style={styles.chart}
        flatColor
        withCustomBarColorFromData
      />
      {/* Custom color overlay — legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#7c6aff' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff6b6b' }]} />
          <Text style={styles.legendText}>High spend</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#17171f',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8884a8',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
});

export default SpendingChart;
