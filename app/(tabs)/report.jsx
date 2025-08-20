// app/(tabs)/report.jsx
import PureFlowLogo from "@components/ui/ui-header";
import ConclusionCard from "@data-display/conclusion-card";
import ParameterCard from "@data-display/parameter-card";
import WaterQualitySummaryCard from "@data-display/water-quality-summary-card";
import { Ionicons } from "@expo/vector-icons";
import { useChartData } from "@hooks/useChartData";
import SegmentedFilter from "@navigation/segmented-filters";
import GlobalWrapper from "@ui/global-wrapper";
import {
  generateWaterQualityReport,
  prepareChartData,
} from "@utils/reportUtils";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ExportToggleButton from "../../src/components/forms/export-toggle-button";

const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

const PARAMETER_CONFIG = {
  pH: { unit: "", safeRange: "6.5 - 8.5", displayName: "pH" },
  temperature: {
    unit: "°C",
    safeRange: "26 - 30°C",
    displayName: "Temperature",
  },
  salinity: { unit: "ppt", safeRange: "0 - 5 ppt", displayName: "Salinity" },
  turbidity: { unit: "NTU", safeRange: "0 - 50 NTU", displayName: "Turbidity" },
};

const getStatusColor = (status) => {
  switch (status) {
    case "critical":
      return "#ef4444";
    case "warning":
      return "#eab308";
    case "normal":
    default:
      return "#22c55e";
  }
};

const timePeriodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const ReportScreen = () => {
  const [activeFilter, setActiveFilter] = useState("daily");
  const [reportData, setReportData] = useState({
    wqi: { value: 0, status: "normal" },
    parameters: {},
    status: "loading",
    message: "Loading report data...",
    generatedAt: null,
  });
  const [error, setError] = useState(null);

  // Use the useChartData hook to fetch data
  const {
    chartData,
    loading,
    error: chartError,
    refreshData,
  } = useChartData("reports", activeFilter);

  // Process the data when chartData changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      try {
        console.log("Processing chart data for report:", {
          dataLength: chartData.length,
          sampleData: chartData[0],
        });

        // Generate report using the data from useChartData
        const report = generateWaterQualityReport(chartData, activeFilter);

        setReportData({
          ...report,
          generatedAt: new Date().toISOString(),
        });
        setError(null);
      } catch (err) {
        console.error("Error generating report:", err);
        setError({
          message: "Failed to generate report from chart data",
          details: err.toString(),
        });
      }
    } else if (chartError) {
      setError({
        message: chartError,
        details: "Failed to fetch chart data",
      });
    }
  }, [chartData, chartError, activeFilter]);

  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Error handling for the report generation
  useEffect(() => {
    if (error) {
      setReportData({
        status: "error",
        message: error.message,
        parameters: {},
        wqi: { value: 0, status: "unknown" },
        generatedAt: new Date().toISOString(),
      });
    }
  }, [error]);

  const processedParameters = Object.entries(reportData.parameters || {}).map(
    ([key, value]) => {
      const config = PARAMETER_CONFIG[key] || {};

      // Only try to prepare chart data if the value has data points
      let chartData = { labels: [], datasets: [{ data: [] }] };
      try {
        chartData = prepareChartData(reportData, key);
      } catch (err) {
        console.error("Error preparing chart data:", err);
      }

      return {
        parameter: config.displayName || key,
        value: (value.average || 0).toFixed(2),
        unit: config.unit || "",
        safeRange: config.safeRange || "",
        status: value.status || "normal",
        analysis: value.trend?.message || "No trend data available",
        chartData: {
          labels: chartData?.labels || [],
          datasets: [
            {
              data: chartData?.datasets?.[0]?.data || [],
              colors: Array(chartData?.datasets?.[0]?.data?.length || 0).fill(
                (opacity = 1) => getStatusColor(value.status)
              ),
            },
          ],
        },
      };
    }
  );

  // Render loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading report data...</Text>
      </View>
    );
  }

  // Render error state
  if (reportData.status === "error" || error) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
        <Text className="text-xl font-bold text-gray-800 mt-4 mb-2">
          Report Unavailable
        </Text>
        <Text className="text-center text-gray-600 mb-6">
          {error?.message || reportData.message || "Failed to load report data"}
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-lg"
          onPress={onRefresh}
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>

        {__DEV__ && error?.details && (
          <View className="mt-6 p-4 bg-gray-100 rounded-lg w-full">
            <Text className="text-xs text-gray-500 font-mono">
              {error.details}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <GlobalWrapper>
        <PureFlowLogo />

        <SegmentedFilter
          options={timePeriodOptions}
          selectedValue={activeFilter}
          onValueChange={setActiveFilter}
          style={styles.filter}
        />
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={["#3b82f6"]}
            />
          }
        >
          <View style={{ marginBottom: 16 }}>
            <Text style={sectionLabelStyle}>Water Quality Summary</Text>
            <WaterQualitySummaryCard
              qualityLevel={reportData.overallStatus || "normal"}
              lastUpdated={
                reportData.generatedAt
                  ? new Date(reportData.generatedAt).toLocaleTimeString()
                  : "N/A"
              }
              parameters={Object.entries(reportData.parameters || {}).map(
                ([key, value]) => ({
                  name: key,
                  value: value.average || 0,
                  status: value.status || "normal",
                  unit: PARAMETER_CONFIG[key]?.unit || "",
                })
              )}
            />
          </View>

          <View styles={{ marginBottom: 16 }}>
            <Text style={sectionLabelStyle}>Key Parameters Report</Text>
            {processedParameters.map((param, index) => (
              <ParameterCard key={param.parameter} {...param} />
            ))}
          </View>

          <View style={{ marginBottom: 16, marginTop: 10 }}>
            <Text style={sectionLabelStyle}>
              Quality Report and Recommendation
            </Text>
            <ConclusionCard
              status={reportData.overallStatus || "normal"}
              message={
                reportData.overallStatus === "critical"
                  ? "Immediate action required for critical parameters."
                  : reportData.overallStatus === "warning"
                  ? "Some parameters require attention."
                  : "All parameters are within normal ranges."
              }
              recommendations={
                reportData.recommendations || [
                  "Regularly monitor all parameters",
                  "Check system for any anomalies",
                ]
              }
            />
          </View>
        </ScrollView>
      </GlobalWrapper>

      <ExportToggleButton />
    </View>
  );
};

const styles = StyleSheet.create({
  filter: {
    marginVertical: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  errorDetails: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 5,
    width: "100%",
  },
  errorText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
});

export default ReportScreen;
