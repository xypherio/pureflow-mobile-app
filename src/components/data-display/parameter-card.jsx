// src/components/data-display/ParameterCard.jsx
import { ChevronDown, ChevronUp, Droplet, Gauge, Minus, Plus, Thermometer, Waves } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

// Parameter title colors
const PARAMETER_COLORS = {
  'pH': '#007bff',
  'pH Value': '#007bff',
  'Temperature': '#e83e8c',
  'Turbidity': '#28a745',
  'Salinity': '#8b5cf6',
};

const getParameterIcon = (paramName) => {
  const iconSize = 170;
  const iconStyles = { position: 'absolute', bottom: 0, right: -40 };
  
  switch(paramName.toLowerCase()) {
    case 'ph':
    case 'ph value':
      return <Gauge size={iconSize} color="rgba(59, 130, 246, 0.08)" style={iconStyles} />;
    case 'temperature':
      return <Thermometer size={iconSize} color="rgba(216, 42, 113, 0.08)" style={iconStyles} />;
    case 'turbidity':
      return <Droplet size={iconSize} color="rgba(16, 185, 129, 0.08)" style={iconStyles} />;
    case 'salinity':
      return <Waves size={iconSize} color="rgba(139, 92, 246, 0.08)" style={iconStyles} />;
    default:
      return null;
  }
};

const ParameterCard = ({ 
  parameter, 
  value, 
  unit, 
  safeRange, 
  status, 
  analysis, 
  chartData,
  minValue,
  maxValue,
  style 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors = {
    normal: {
      borderColor: '#10B981',
      shadowColor: '#10B981',
      bgColor: '#ECFDF5',
      iconColor: '#059669',
      gradientColors: ['#D1FAE5', '#A7F3D0']
    },
    caution: {
      borderColor: '#F59E0B',
      shadowColor: '#F59E0B',
      bgColor: '#FFFBEB',
      iconColor: '#D97706',
      gradientColors: ['#FEF3C7', '#FDE68A']
    },
    critical: {
      borderColor: '#EF4444',
      shadowColor: '#EF4444',
      bgColor: '#FEF2F2',
      iconColor: '#DC2626',
      gradientColors: ['#FEE2E2', '#FECACA']
    }
  };
  
  const statusConfig = statusColors[status] || statusColors.normal;

  const backgroundIcon = getParameterIcon(parameter);
  
  return (
    <View style={[
        styles.card, 
        style, 
        { 
          shadowColor: statusConfig.shadowColor,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: statusConfig.borderColor + '80',
          overflow: 'hidden',
        }
      ]}>
      {backgroundIcon && (
        <View style={styles.backgroundIconContainer}>
          {backgroundIcon}
        </View>
      )}
      <View style={[styles.gradientOverlay, { 
        backgroundColor: statusConfig.borderColor + '30',
        opacity: 0.3
      }]} />
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerContent}>
          <View style={styles.parameterHeader}>
            <Text style={[
              styles.parameterName, 
              { color: PARAMETER_COLORS[parameter] || '#1e293b' }
            ]}>
              {parameter}
            </Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={24} color="#64748b" />
        ) : (
          <ChevronDown size={24} color="#64748b" />
        )}
      </TouchableOpacity>

      <View style={[styles.content, { backgroundColor: statusConfig.bgColor + '40' }]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.borderColor }]} />
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          <Text style={styles.safeRange}>Safe range: {safeRange}</Text>
        </View>
        
        {expanded && (minValue !== undefined || maxValue !== undefined) && (
          <View style={styles.valueRangeContainer}>
            <View style={styles.rangeItem}>
              <Minus size={14} color="#64748b" />
              <Text style={styles.rangeText}>
                Min: {minValue !== undefined ? minValue.toFixed(2) : 'N/A'} {unit}
              </Text>
            </View>
            <View style={styles.rangeItem}>
              <Plus size={14} color="#64748b" />
              <Text style={styles.rangeText}>
                Max: {maxValue !== undefined ? maxValue.toFixed(2) : 'N/A'} {unit}
              </Text>
            </View>
          </View>
        )}
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
    borderRadius: 20,
    padding: 20,
    marginVertical: 5,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.3,
  },
  parameterHeader: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
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