/** LinechartCard - Interactive line chart with parameter filtering, tooltips, and scrollable views for historical data */
import { Activity } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "../../constants/colors";
import { useData } from "../../contexts/DataContext";
import {
  CHART_DIMENSIONS,
  chartYAxisConfig,
  getParameterOptions
} from "../../utils/chart-config";
import SegmentedFilter from "../navigation/SegmentedFilters";
import ChartTooltip from "../ui/ChartToolTip";

const { width: screenWidth } = Dimensions.get("window");


const getParameterColor = (parameter) => {
  const parameterColors = {
    pH: colors.phColor,
    temperature: colors.tempColor,
    turbidity: colors.turbidityColor,
    salinity: colors.salinityColor,
  };
  return parameterColors[parameter] || colors.primary;
};

// Status colors matching ParameterCard design
const STATUS_COLORS = {
  normal: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    bgColor: '#ECFDF5',
    gradientColors: ['#D1FAE5', '#A7F3D0']
  },
  caution: {
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    bgColor: '#FFFBEB',
    gradientColors: ['#FEF3C7', '#FDE68A']
  },
  current: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    bgColor: '#EEF2FF',
    gradientColors: ['#E0E7FF', '#C7D2FE']
  }
};

// Background icon for chart representation
const getChartBackgroundIcon = () => {
  const iconSize = 160;
  return (
    <Activity
      size={iconSize}
      color="rgba(99, 102, 241, 0.06)"
      style={styles.iconStyles}
    />
  );
};

const LineChartCard = ({
  title = "Water Quality Trends",
  data: propData,
  loading: propLoading,
  error: propError,
  lastUpdated: propLastUpdated,
}) => {
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Status configuration for styling (matches ParameterCard design)
  const statusConfig = STATUS_COLORS.current;

  // Parameter options for the segmented filter
  const parameterOptions = getParameterOptions();

  // Get data from DataContext
  const {
    sensorData,
    realtimeData,
    loading: contextLoading,
    lastUpdate,
  } = useData();

  const loading = propLoading !== undefined ? propLoading : contextLoading;
  const error = propError !== undefined ? propError : null;
  const lastUpdated =
    propLastUpdated !== undefined
      ? propLastUpdated
      : lastUpdate
        ? new Date(lastUpdate)
        : null;

  // Process chart data from DataContext - prioritize realtime data that matches realtime cards
  const { datasets, labels } = useMemo(() => {
    if (propData) {
      return propData; // Use passed data directly
    }

    // Start with historical sensorData
    let combinedData = [...(sensorData || [])];

    // Always add current realtime data if available to match what realtime cards display
    // This ensures the line chart reflects realtime data regardless of recency
    if (realtimeData && (
        realtimeData.reading ||
        (realtimeData.pH !== undefined && realtimeData.temperature !== undefined)
      )) { // Include if has sensor data in "reading" property or direct properties
      // Use datetime from various possible locations, fallback to current time
      let datetimeValue = realtimeData.datetime || realtimeData.reading?.datetime;

      // If still no datetime, check if it's a nested property in reading
      if (!datetimeValue && realtimeData.reading?.timestamp) {
        datetimeValue = realtimeData.reading.timestamp;
      }

      datetimeValue = datetimeValue || new Date().toISOString();
      const realtimeTimestamp = new Date(datetimeValue).getTime();

      // Extract sensor values from realtime data (handle both direct and nested structures)
      let sensorValues = realtimeData;
      if (realtimeData.reading) {
        sensorValues = realtimeData.reading;
      }

      // Create a data point for the current realtime values
      const currentDataPoint = {
        datetime: datetimeValue, // Use datetime field or fallback to current time
        pH: sensorValues.pH,
        temperature: sensorValues.temperature,
        turbidity: sensorValues.turbidity,
        salinity: sensorValues.salinity,
      };

      // Add to combined data (avoid duplicates based on timestamp)
      const existingIndex = combinedData.findIndex(item => {
        const itemTime = new Date(item.datetime).getTime();
        return Math.abs(itemTime - realtimeTimestamp) < 60000; // Within 1 minute
      });

      if (existingIndex === -1) {
        combinedData.push(currentDataPoint);
      } else {
        // Update existing entry with realtime data
        combinedData[existingIndex] = { ...combinedData[existingIndex], ...currentDataPoint };
      }
    }

    if (!combinedData || combinedData.length === 0) {
      return { datasets: [], labels: [] };
    }

    // Sort by datetime to ensure chronological order
    combinedData.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    // Process combined data for chart display
    const labels = combinedData.map((item) =>
      item.datetime
        ? new Date(item.datetime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "Unknown"
    );

    const parameters = selectedParameter
      ? [selectedParameter]
      : ["pH", "temperature", "turbidity", "salinity"];

    const datasets = parameters.map((param) => ({
      data: combinedData
        .map((item) => {
          let value;
          // Handle case-insensitive parameter access
          if (item[param] !== undefined) {
            value = item[param];
          } else if (item[param.toLowerCase()] !== undefined) {
            value = item[param.toLowerCase()];
          } else if (item[param.toUpperCase()] !== undefined) {
            value = item[param.toUpperCase()];
          }

          return value !== null && value !== undefined ? Number(value) : null; // Use null instead of 0 for missing data
        })
        .filter((val) => val !== null), // Filter out null values for cleaner display
      parameter: param,
      name: param,
      color: (opacity = 1) => {
        const color = getParameterColor(param);
        return color;
      },
      propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: getParameterColor(param),
        fill: "#FFF",
      },
    }));

    return { datasets, labels };
  }, [propData, sensorData, realtimeData, selectedParameter]);

  // Handle parameter selection change
  const handleParameterChange = (value) => {
    // If clicking the currently selected parameter, deselect it (show all)
    if (selectedParameter === value) {
      setSelectedParameter(null);
    } else {
      setSelectedParameter(value);
    }
    // Hide tooltip when changing parameters
    setTooltipVisible(false);
  };

  // Hide tooltip when tapping outside
  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  // Handle data point press
  const handleChartDataPointPress = ({ index, x, y, value }) => {
    // Find which dataset this point belongs to by matching the value
    let clickedParameter = selectedParameter;

    // If showing multiple parameters, find the matching dataset
    if (!selectedParameter && datasets.length > 0) {
      for (const dataset of datasets) {
        if (
          dataset.data[index] === value ||
          Math.abs(dataset.data[index] - value) < 0.01
        ) {
          clickedParameter = dataset.parameter || dataset.name;
          break;
        }
      }
    }

    const pointData = {
      value,
      timestamp: labels[index],
      parameter: clickedParameter || "Parameter",
      color: getParameterColor(clickedParameter),
    };

    // Adjust tooltip position to appear right above the point
    const tooltipX = x - 66; // Center tooltip (adjust based on tooltip width)
    const tooltipY = y - 85; // Position above point with small gap

    setTooltipData(pointData);
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setTooltipVisible(true);
  };

  const hasDataToShow = useMemo(() => {
    const result = (() => {
      // If explicit prop data is passed in, use it
      if (propData && propData.datasets && propData.datasets.length > 0) {
        return propData.datasets.some((d) => d.data.length > 0);
      }

      // Show chart if we have datasets with actual data points
      // This covers both historical data only, realtime data only, or combined data
      if (datasets && datasets.length > 0) {
        return datasets.some((ds) => ds.data && ds.data.length > 0);
      }

      // Legacy fallback check (historical data without datasets processing)
      return (
        sensorData &&
        sensorData.length > 0
      );
    })();



    return result;
  }, [propData?.datasets, sensorData, datasets]);

  // Memoize Y-axis configuration to prevent recreation
  const yAxisConfig = useMemo(() => {
    const config = selectedParameter
      ? chartYAxisConfig[selectedParameter]
      : chartYAxisConfig.default;

    return {
      min: config.min,
      max: config.max,
      interval: config.interval,
      // Calculate number of segments based on range and interval
      count: Math.floor((config.max - config.min) / config.interval),
    };
  }, [selectedParameter]);

  // Determine if chart should be scrollable based on data points
  const dataPointCount = labels.length;
  const isScrollable = dataPointCount >= 10;
  const chartWidth = screenWidth - CHART_DIMENSIONS.containerWidth;
  const scrollableChartWidth = Math.max(dataPointCount * 60, chartWidth);

  return (
    <View style={[
      styles.container,
      {
        shadowColor: statusConfig.shadowColor,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: statusConfig.borderColor + '80',
        overflow: 'hidden',
      }
    ]}>
      {getChartBackgroundIcon() && (
        <View style={styles.backgroundIconContainer}>
          {getChartBackgroundIcon()}
        </View>
      )}
      <View style={[styles.gradientOverlay, {
        backgroundColor: statusConfig.borderColor + '30',
        opacity: 0.3
      }]} />
      {/* Parameter Filter */}
      <View style={styles.filterContainer}>
        <SegmentedFilter
          options={parameterOptions}
          selectedValue={selectedParameter}
          onValueChange={handleParameterChange}
          style={styles.segmentedFilter}
        />
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        {hasDataToShow && datasets.length > 0 ? (
          isScrollable ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{
                position: "relative",
                width: screenWidth - CHART_DIMENSIONS.containerWidth
              }}
              contentContainerStyle={{ alignItems: "center" }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={hideTooltip}
                style={{ position: "relative", alignItems: "center" }}
              >
                <LineChart
                  data={{
                    labels,
                    datasets,
                  }}
                  width={scrollableChartWidth}
                  height={CHART_DIMENSIONS.height}
                  chartConfig={{
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => colors.primary,
                    labelColor: (opacity = 1) => colors.text,
                    // Y-axis specific configuration
                    yAxisMin: yAxisConfig.min,
                    yAxisMax: yAxisConfig.max,
                    formatYLabel: (value) => {
                      const units = {
                        temperature: '°C',
                        turbidity: 'NTU',
                        salinity: 'ppt',
                        pH: 'pH'
                      };

                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      const formatted = parseFloat(value).toFixed(2);
                      const unit = selectedParameter ? ` ${units[selectedParameter] || ''}` : '';
                      return `${formatted}${unit}`;
                    },
                    // Subtle background grid lines
                    propsForBackgroundLines: {
                      strokeWidth: 0.5,
                      stroke: '#e2e8f0',
                    },
                    // Only set global propsForDots when showing single parameter
                    ...(selectedParameter ? {
                    propsForDots: {
                      r: "5",
                      strokeWidth: "3",
                      fill: getParameterColor(selectedParameter),
                    },
                    } : {}),
                    // Style configurations
                    strokeWidth: 2,
                    fillShadowGradientOpacity: 0.2,
                  }}
                  fromZero={false}
                  segments={yAxisConfig.count}
                  bezier={false}
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withVerticalLabels={false}
                  withHorizontalLabels={true}
                  onDataPointClick={handleChartDataPointPress}
                />
                <ChartTooltip
                  data={tooltipData}
                  visible={tooltipVisible}
                  position={tooltipPosition}
                  onHide={() => setTooltipVisible(false)}
                />
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.chartWrapper}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={hideTooltip}
                style={styles.chartWrapper}
              >
                <LineChart
                  data={{
                    labels,
                    datasets,
                  }}
                  width={chartWidth}
                  height={CHART_DIMENSIONS.height}
                  chartConfig={{
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => colors.primary,
                    labelColor: (opacity = 1) => colors.text,
                    // Y-axis specific configuration
                    yAxisMin: yAxisConfig.min,
                    yAxisMax: yAxisConfig.max,
                    formatYLabel: (value) => {
                      const units = {
                        temperature: '°C',
                        turbidity: 'NTU',
                        salinity: 'ppt',
                        pH: 'pH'
                      };

                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      const formatted = parseFloat(value).toFixed(2);
                      const unit = selectedParameter ? ` ${units[selectedParameter] || ''}` : '';
                      return `${formatted}${unit}`;
                    },
                    // Subtle background grid lines
                    propsForBackgroundLines: {
                      strokeWidth: 0.8,
                      stroke: '#e2e8f0',
                    },
                    // Only set global propsForDots when showing single parameter
                    ...(selectedParameter ? {
                    propsForDots: {
                      r: "5",
                      strokeWidth: "3",
                      fill: getParameterColor(selectedParameter),
                    },
                    } : {}),
                    // Style configurations
                    strokeWidth: 2,
                    fillShadowGradientOpacity: 0.2,
                  }}
                  fromZero={false}
                  segments={yAxisConfig.count}
                  bezier={false}
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withVerticalLabels={false}
                  withHorizontalLabels={true}
                  onDataPointClick={handleChartDataPointPress}
                />
                <ChartTooltip
                  data={tooltipData}
                  visible={tooltipVisible}
                  position={tooltipPosition}
                  onHide={() => setTooltipVisible(false)}
                />
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View
            style={[styles.emptyState, { height: CHART_DIMENSIONS.height }]}
          >
            <Text style={styles.emptyStateText}>
              {error
                ? `Error: ${error}`
                : loading
                  ? "Loading chart data..."
                  : "No data available for now"}
            </Text>
            {error && (
              <Text style={styles.errorText}>
                Chart data: {datasets?.length ? "Available" : "None"}, Labels:{" "}
                {labels?.length || 0}
              </Text>
            )}
            {!loading && !error && (!datasets || datasets.length === 0) && (
              <Text style={styles.errorText}>
                Data points: {sensorData?.length || 0}, Datasets:{" "}
                {datasets?.length || 0}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Last Updated */}
      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Last updated:{" "}
          {lastUpdated instanceof Date
            ? lastUpdated.toLocaleTimeString()
            : new Date(lastUpdated).toLocaleTimeString()}
        </Text>
      )}

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {selectedParameter
            ? `Showing ${selectedParameter} trends`
            : "Showing all water quality parameters"}
        </Text>
        <Text style={styles.subInfoText}>
          Tap/Click on chart points to view detailed values
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
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
  iconStyles: {
    position: 'absolute',
    bottom: 0,
    right: -40,
  },

  filterContainer: {
    marginBottom: 16,
  },
  segmentedFilter: {
    marginBottom: 0,
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  chartWrapper: {
    position: "relative",
    width: screenWidth - CHART_DIMENSIONS.containerWidth,
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
  },

  lastUpdated: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 8,
  },
  infoContainer: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  subInfoText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
  },
});

export default LineChartCard;
