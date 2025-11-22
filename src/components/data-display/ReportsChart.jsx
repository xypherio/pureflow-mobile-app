import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import LinearChart from './LinearChart';

export default ReportsChart = ({ title = 'Water Quality Reports', height = 350 }) => {
  const [timeFilter, setTimeFilter] = useState('daily');
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Time filter options
  const timeFilterOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annually' }
  ];

  // Handle time filter change
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    // Hide tooltip when changing filters
    setTooltipVisible(false);
  };

  // Handle data point press from chart
  const handleDataPointPress = (tooltipInfo, pointIndex) => {
    setTooltipData(tooltipInfo);
    setTooltipVisible(true);
    
    // Position tooltip above the chart
    setTooltipPosition({
      x: 20,
      y: 20
    });
  };

  // Hide tooltip when tapping outside
  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  // Get description for current time filter
  const getTimeFilterDescription = () => {
    switch (timeFilter) {
      case 'daily':
        return '2-hour interval averages for today';
      case 'weekly':
        return 'Daily averages for current week (Monday to Sunday)';
      case 'monthly':
        return 'Daily averages for current month';
      case 'annually':
        return 'Monthly averages for current year';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={hideTooltip} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Time Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Time Range:</Text>
        <View style={styles.filterButtons}>
          {timeFilterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                timeFilter === option.value && styles.filterButtonActive
              ]}
              onPress={() => handleTimeFilterChange(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === option.value && styles.filterButtonTextActive
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        <LinearChart
          type="reports"
          timeFilter={timeFilter}
          height={height}
          showLegend={true}
          onDataPointPress={handleDataPointPress}
        />
      </View>

      {/* Tooltip */}
      <ChartTooltip
        data={tooltipData}
        visible={tooltipVisible}
        position={tooltipPosition}
      />

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {getTimeFilterDescription()}
        </Text>
        <Text style={styles.subInfoText}>
          Tap on chart points to view detailed values
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  refreshText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subInfoText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});