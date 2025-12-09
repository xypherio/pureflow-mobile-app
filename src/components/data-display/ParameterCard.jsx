/** ParameterCard - Expandable parameter card with bar chart, AI insights, and detailed metrics display */
/**
 * @param {Object} props
 * @param {string} props.parameter - Parameter name (e.g., 'pH', 'temperature')
 * @param {string|number} props.value - Current parameter value
 * @param {string} props.unit - Unit of measurement (e.g., '°C', 'ppt')
 * @param {string} props.safeRange - Safe range description
 * @param {'normal'|'caution'|'critical'} props.status - Quality status
 * @param {string} props.analysis - Trend analysis text
 * @param {Array} props.chartData - Chart data points with labels and datasets
 * @param {number} props.minValue - Minimum value encountered
 * @param {number} props.maxValue - Maximum value encountered
 * @param {string} props.insight - AI-generated insight text (deprecated - insights are now generated automatically)
 */

import { useInsights } from '@contexts/InsightsContext';
import { ChevronDown, ChevronUp, Droplet, Gauge, Minus, Plus, Thermometer, Waves } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { WaterQualityCalculator } from '../../services/core/WaterQualityCalculator';
import ChartTooltip from '../ui/ChartToolTip';

const { width: screenWidth } = Dimensions.get('window');

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
  const iconStyles = styles.iconStyles;

  if (!paramName) return null;

  switch (paramName.toString().toLowerCase()) {
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

const hexToRgba = (hex, opacity = 1) => {
  if (!hex) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  let sanitized = hex.replace('#', '');

  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  if (sanitized.length !== 6) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  const integer = parseInt(sanitized, 16);
  const r = (integer >> 16) & 255;
  const g = (integer >> 8) & 255;
  const b = integer & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
  insight,
  style
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const { generateComponentInsight, getComponentInsight, isComponentLoading, getComponentError } = useInsights();

  // Calculate parameter score and determine threshold-based status
  const calculatedStatus = useMemo(() => {
    if (!value || !parameter) return 'normal';

    const calculator = new WaterQualityCalculator();
    const score = calculator.calculateParameterScore(parameter, value);

    // Normal: score >= 80, Approaching: score < 80
    return score >= 80 ? 'normal' : 'approaching';
  }, [value, parameter]);

const statusColors = {
  normal: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    bgColor: '#ECFDF5',    
    iconColor: '#059669',
    gradientColors: ['#D1FAE5', '#A7F3D0']
  },
  approaching: {
    borderColor: '#DC2626', 
    shadowColor: '#DC2626',
    bgColor: '#FEF2F2',    
    iconColor: '#DC2626',
    gradientColors: ['#FEE2E2', '#FECACA']
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

  const statusConfig = statusColors[calculatedStatus] || statusColors.normal;

  const backgroundIcon = getParameterIcon(parameter);
  const parameterColor = PARAMETER_COLORS[parameter] || '#007bff';

  const intervalLabelMap = {
    daily: '3-hour',
    weekly: 'daily',
    monthly: 'daily',
  };

  const overallLabelMap = {
    daily: 'full-day',
    weekly: 'weeklong',
    monthly: 'monthlong',
  };

  const aggregatedChartData = useMemo(() => {
    if (!chartData?.labels?.length || !chartData?.datasets?.length) {
      return null;
    }

    const rawValues = chartData.datasets?.[0]?.data || [];
    if (!rawValues.length) {
      return null;
    }

    const points = chartData.labels
      .map((label, index) => {
        const rawValue = rawValues[index];
        if (rawValue === null || rawValue === undefined) {
          return null;
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
          return null;
        }

        return {
          label,
          value: parseFloat(numericValue.toFixed(2)),
        };
      })
      .filter(Boolean);

    if (!points.length) {
      return null;
    }

    return {
      labels: points.map((point) => point.label),
      datasets: [
        {
          data: points.map((point) => point.value),
        },
      ],
      timeRange: chartData.timeRange || 'daily',
    };
  }, [chartData]);

  const chartTimeRange = aggregatedChartData?.timeRange || chartData?.timeRange || 'daily';
  const intervalLabel = intervalLabelMap[chartTimeRange] || 'period';
  const overallLabel = overallLabelMap[chartTimeRange] || 'selected period';

  // Handle chart data point press
  const handleBarDataPointPress = ({ index, x, y, value }) => {
    const pointData = {
      value,
      timestamp: aggregatedChartData.labels[index],
      parameter: parameter,
      color: parameterColor,
    };

    // Adjust tooltip position to appear above the bar
    const tooltipX = x - 50; // Center tooltip
    const tooltipY = y - 60; // Position above the bar

    setTooltipData(pointData);
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setTooltipVisible(true);
  };

  // Handle tooltip hide
  const handleTooltipHide = () => {
    setTooltipVisible(false);
  };

  // Generate insights for this parameter when expanded
  const componentId = `${parameter?.toLowerCase().replace(/[^a-z0-9]/g, '-')}-insight`;

  useEffect(() => {
    if (expanded && parameter && value !== undefined && aggregatedChartData) {
      const sensorData = {
        parameter,
        value,
        unit,
        chartData: aggregatedChartData,
        minValue,
        maxValue,
        status,
        safeRange,
        analysis
      };

      generateComponentInsight(componentId, sensorData).catch(error => {
        console.warn('Failed to generate insight for parameter:', parameter, error);
      });
    }
  }, [expanded, parameter, value, aggregatedChartData, generateComponentInsight, componentId, unit, minValue, maxValue, status, safeRange, analysis]);

  // Get current insight
  const currentInsight = getComponentInsight(componentId);
  const insightLoading = isComponentLoading(componentId);
  const insightError = getComponentError(componentId);

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
                Min: {minValue !== undefined && minValue !== null ? Number(minValue).toFixed(2) : 'N/A'} {unit}
              </Text>
            </View>
            <View style={styles.rangeItem}>
              <Plus size={14} color="#64748b" />
              <Text style={styles.rangeText}>
                Max: {maxValue !== undefined && maxValue !== null ? Number(maxValue).toFixed(2) : 'N/A'} {unit}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.analysis} numberOfLines={expanded ? undefined : 1}>
          {analysis}
        </Text>

        {expanded && aggregatedChartData && (
          <View style={styles.chartContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleTooltipHide}
                style={[styles.chart, { width: screenWidth - 40 }]}
              >
                <BarChart
                data={aggregatedChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 2,
                  color: (opacity = 1) => hexToRgba(parameterColor, opacity),
                  barPercentage: aggregatedChartData.timeRange === 'daily' ? 0.7 : 0.85,
                  style: {
                    borderRadius: 16,
                  },
                  propsForBackgroundLines: {
                    strokeWidth: 0.5,
                    stroke: '#e2e8f0',
                  },
                  propsForLabels: {
                    fontSize: aggregatedChartData.labels?.length > 12 ? 8 : 10,
                  },
                  barRadius: 6,
                  fillShadowGradient: hexToRgba(parameterColor, 0.85),
                  fillShadowGradientOpacity: 1,
                }}
                verticalLabelRotation={aggregatedChartData.labels?.length > 10 ? -45 : 0}
                fromZero
                showBarTops={false}
                withInnerLines
                showValuesOnTopOfBars={false}
                withCustomBarColorFromData={false}
                flatColor
                style={styles.chart}
                segments={Math.min(Math.max(aggregatedChartData.datasets[0].data.length, 1), 8)}
                yAxisSuffix={unit ? ` ${unit}` : ''}
                yAxisInterval={1}
                formatYLabel={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return parseFloat(value).toFixed(0);
                }}
                formatXLabel={(value) => {
                  if (typeof value === 'string' && value.includes('-')) {
                    return value.split('-').pop();
                  }
                  return value;
                }}
                onDataPointClick={handleBarDataPointPress}
              />
              </TouchableOpacity>
            </ScrollView>
            <Text style={styles.chartNote}>
              {`Showing ${aggregatedChartData.labels.length} aggregated ${intervalLabel} averages. Value above reflects the ${overallLabel} average.`}
            </Text>
            <ChartTooltip
              data={tooltipData}
              visible={tooltipVisible}
              position={tooltipPosition}
              onHide={() => setTooltipVisible(false)}
            />

            <View style={[styles.insightContainer, {
              borderLeftColor: parameterColor,
            }]}>
              <Text style={[styles.insightTitle, {
                color: parameterColor,
              }]}>💡 AI Insight</Text>
              {insightLoading ? (
                <Text style={styles.insightText}>Generating insight...</Text>
              ) : insightError ? (
                <Text style={styles.insightText}>Unable to generate insight at this time.</Text>
              ) : currentInsight?.insights?.overallInsight ? (
                <Text style={styles.insightText}>{currentInsight.insights.overallInsight}</Text>
              ) : (
                <Text style={styles.insightText}>Insights will be available once the AI analyzes this parameter's data.</Text>
              )}
            </View>
          </View>
        )}
        {expanded && !aggregatedChartData && (
          <Text style={styles.chartNote}>
            No chart data available for this period.
          </Text>
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
  parameterHeader: {
    flex: 1,
    marginRight: 8,
  },
  parameterName: {
    fontSize: 16,
    fontWeight: '600',
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
  valueRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
  },
  rangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  chartScrollContent: {
    paddingRight: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartNote: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'left',
    marginTop: 8,
  },
  insightContainer: {
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6b7280', // Neutral gray as fallback
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280', // Neutral gray as fallback
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  iconStyles: {
    position: 'absolute',
    bottom: 0,
    right: -40,
  },
});

export default ParameterCard;
