import { useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "../../constants/colors";
import { useChartData } from "../../hooks/useChartData";
import { globalStyles } from "../../styles/globalStyles";
import {
  CHART_DIMENSIONS,
  chartYAxisConfig,
  getDefaultChartConfig,
  getParameterOptions,
} from "../../utils/chart-config";
import { processChartData } from "../../utils/data-processing";
import SegmentedFilter from "../navigation/segmented-filters";
import ChartTooltip from "../ui/chart-tool-tip";

const { width: screenWidth } = Dimensions.get("window");

const getParameterColor = (parameter) => {
  const parameterColors = {
    ph: colors.phColor,
    temperature: colors.tempColor,
    turbidity: colors.turbidityColor,
    salinity: colors.salinityColor,
  };
  return parameterColors[parameter?.toLowerCase()] || colors.primary;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6fafd",
    borderRadius: 16,
    padding: 12,
    marginTop: 20,
    marginBottom: 10,
    justifyContent: "flex-start",
    ...globalStyles.boxShadow,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
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
    fontWeight: "500",
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
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
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
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
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

  // Parameter options for the segmented filter
  const parameterOptions = getParameterOptions();

  // Get chart data using the hook if no data is passed via props
  const hookResult = useChartData("home", "daily", selectedParameter);

  const loading = propLoading !== undefined ? propLoading : hookResult.loading;
  const error = propError !== undefined ? propError : hookResult.error;
  const lastUpdated =
    propLastUpdated !== undefined ? propLastUpdated : hookResult.lastUpdated;

  // Prepare chart data based on filters
  const { datasets, labels } = useMemo(() => {
    if (propData) {
      return propData; // Use passed data directly
    }

    const processedData = processChartData(
      hookResult.chartData,
      selectedParameter
    );

    // Always color code each dataset based on parameter
    if (processedData.datasets) {
      return {
        labels: processedData.labels,
        datasets: processedData.datasets.map((dataset) => ({
          ...dataset,
          color: (opacity = 1) => {
            const color = getParameterColor(dataset.parameter || dataset.name);
            return color;
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: getParameterColor(dataset.parameter || dataset.name),
            fill: "#FFF",
          },
        })),
      };
    }

    return processedData;
  }, [propData, hookResult.chartData, selectedParameter]);

  // Handle parameter selection change
  const handleParameterChange = (value) => {
    setSelectedParameter(value);
    // Hide tooltip when changing parameters
    setTooltipVisible(false);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setSelectedParameter(null); // Reset to show all parameters
    setTooltipVisible(false);
    // You can add additional refresh logic here if needed
  };

  // Handle data point press from chart
  const handleDataPointPress = (tooltipInfo, pointIndex) => {
    setTooltipData(tooltipInfo);
    setTooltipVisible(true);

    // Position tooltip above the chart
    setTooltipPosition({
      x: 20,
      y: 20,
    });
  };

  // Hide tooltip when tapping outside
  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  // Handle data point press
  const handleChartDataPointPress = ({ index, x, y, value }) => {
    const pointData = {
      value,
      timestamp: labels[index],
      parameter: selectedParameter || datasets[0]?.name || "Parameter",
    };

    // Adjust tooltip position to appear right above the point
    const tooltipX = x - 66; // Center tooltip (adjust based on tooltip width)
    const tooltipY = y - 85; // Position above point with small gap

    setTooltipData(pointData);
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setTooltipVisible(true);
  };

  // Chart configuration
  const chartConfig = getDefaultChartConfig();

  const hasData =
    propData && propData.datasets && propData.datasets.length > 0
      ? propData.datasets.some((d) => d.data.length > 0)
      : hookResult.hasData;

  // Update Y-axis configuration
  const getYAxisConfig = (parameter) => {
    // Get the correct configuration based on parameter
    const config = parameter
      ? chartYAxisConfig[parameter.toLowerCase()]
      : chartYAxisConfig.default;

    return {
      min: config.min,
      max: config.max,
      interval: config.interval,
      // Calculate number of segments based on range and interval
      count: Math.floor((config.max - config.min) / config.interval),
    };
  };

  const yAxisConfig = getYAxisConfig(selectedParameter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

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
        {hasData && datasets.length > 0 ? (
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
                width={screenWidth - CHART_DIMENSIONS.widthOffset}
                height={CHART_DIMENSIONS.height}
                chartConfig={{
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.primary,
                  labelColor: (opacity = 1) => colors.text,
                  // Y-axis specific configuration
                  yAxisMin: yAxisConfig.min,
                  yAxisMax: yAxisConfig.max,
                  // Other configurations
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    fill: "#FFF",
                    stroke: colors.primary,
                  },
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
                withVerticalLabels={true}
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
                Chart data: {datasets?.length ? 'Available' : 'None'}, Labels: {labels?.length || 0}
              </Text>
            )}
            {!loading && !error && (!datasets || datasets.length === 0) && (
              <Text style={styles.errorText}>
                No data fetched from database
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Last Updated */}
      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
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

export default LineChartCard;
