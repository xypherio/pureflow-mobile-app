// src/components/data-display/ParameterCard.jsx
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const ParameterCard = ({ 
  parameter, 
  value, 
  unit, 
  safeRange, 
  status, 
  analysis, 
  chartData,
  style 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors = {
    normal: '#22c55e',
    caution: '#eab308',
    critical: '#ef4444'
  };

  return (
    <View style={[styles.card, style, { borderLeftColor: statusColors[status] }]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerContent}>
          <Text style={styles.parameterName}>{parameter}</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={24} color="#64748b" />
        ) : (
          <ChevronDown size={24} color="#64748b" />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          <Text style={styles.safeRange}>Safe range: {safeRange}</Text>
        </View>
        <Text style={styles.analysis} numberOfLines={expanded ? undefined : 1}>
          {analysis}
        </Text>

        {expanded && chartData && (
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={300}
              height={180}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.5,
                style: { 
                  borderRadius: 16,
                  paddingRight: 15 // Add right padding to prevent last bar from being cut off
                },
                propsForBackgroundLines: {
                  strokeWidth: 0.5,
                  stroke: '#e2e8f0'
                }
              }}
              verticalLabelRotation={-45}
              fromZero
              showBarTops={false}
              withInnerLines={true}
              showValuesOnTopOfBars={true}
              withCustomBarColorFromData={true}
              flatColor={true}
              style={styles.chart}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  parameterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  unit: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  content: {
    marginTop: 12,
    overflow: 'visible',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 12,
    textTransform: 'uppercase',
  },
  safeRange: {
    fontSize: 12,
    color: '#64748b',
  },
  analysis: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
});

export default ParameterCard;