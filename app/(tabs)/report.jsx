import ExportToggleButton from "@components/forms/ExportToggleButton";
import PureFlowLogo from "@components/ui/UiHeader";
import InsightsCard from "@dataDisplay/InsightsCard";
import ParameterCard from "@dataDisplay/ParameterCard";
import WaterQualitySummaryCard from "@dataDisplay/WaterQualitySummaryCard";
import { Ionicons } from "@expo/vector-icons";
import { useChartData } from "@hooks/useChartData";
import SegmentedFilter from "@navigation/SegmentedFilters";
import { generateInsight } from "@services/ai/geminiAPI";
import PdfGenerator from "../../src/PdfGenerator";
import EmptyState from "@ui/EmptyState";
import GlobalWrapper from "@ui/GlobalWrapper";
import { generateCsv, prepareExportData, shareFiles } from "@utils/exportUtils"; // Import new functions
import {
  generateWaterQualityReport,
  prepareChartData,
} from "@utils/reportUtils";
import { useCallback, useEffect, useState } from "react"; // Removed useRef
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PARAMETER_CONFIG = {
  pH: { unit: "", safeRange: "6.5 - 8.5", displayName: "pH" },
  temperature: {
    unit: "°C",
    safeRange: "26 - 30°C",
    displayName: "Temperature",
  },
  salinity: { unit: "ppt", safeRange: "0 - 5 ppt", displayName: "Salinity" },
  turbidity: { unit: "NTU", safeRange: "0 - 50 NTU", displayName: "Turbidity" },
  tds: { unit: "mg/L", safeRange: "0 - 1000 mg/L", displayName: "TDS" },
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
  const [isExporting, setIsExporting] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [chartImageBase64, setChartImageBase64] = useState(null); // State to hold chart Base64

  // Use the useChartData hook to fetch data
  const {
    chartData,
    loading,
    error: chartError,
    refreshData,
  } = useChartData("reports", activeFilter);

  // Debug: Log the raw chart data
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      // Silent debug logging - only in development
      if (__DEV__) {
        console.log("Raw chart data sample:", chartData[0]);
        console.log(
          "All pH values:",
          chartData.map((item) => ({
            pH: item.pH,
            datetime: item.datetime,
            hasPH: "pH" in item,
            keys: Object.keys(item),
          }))
        );
      }
    }
  }, [chartData]);

  // Process the data when chartData changes
  useEffect(() => {
    console.log('📊 [Report] Chart data changed:', {
      chartData: chartData ? `Array(${chartData.length})` : 'null',
      loading,
      error: chartError,
      activeFilter,
      hasPH: chartData?.[0]?.pH !== undefined ? 'yes' : 'no',
      keys: chartData?.[0] ? Object.keys(chartData[0]) : 'no data',
      sample: chartData?.[0] || 'no data'
    });
    
    if (chartData && !loading) {
      try {
        // Log the first few data points for inspection
        if (chartData.length > 0) {
          console.log('🔍 [Report] Sample data points:', {
            count: chartData.length,
            first: chartData[0],
            last: chartData[chartData.length - 1],
            allKeys: [...new Set(chartData.flatMap(Object.keys))]
          });
        } else {
          console.warn('⚠️ [Report] Empty chartData array received');
        }
        if (chartData.length === 0) {
          // Silent handling - no console logs in production
          setReportData({
            wqi: { value: 0, status: "unknown" },
            parameters: {},
            status: "empty",
            message: "No data available for the selected time period",
            generatedAt: new Date().toISOString(),
            overallStatus: "unknown",
          });
          setError(null);
          return;
        }

        // Generate report using the data from useChartData
        console.log('🔄 [Report] Generating water quality report...', {
          dataPoints: chartData.length,
          timeRange: activeFilter,
          firstPoint: chartData[0],
          lastPoint: chartData[chartData.length - 1]
        });
        
        const report = generateWaterQualityReport(chartData, activeFilter);
        
        console.log('✅ [Report] Report generated:', {
          status: report.status,
          parameters: report.parameters ? Object.keys(report.parameters) : 'none',
          message: report.message,
          hasWQI: !!report.wqi,
          parametersWithData: report.parameters ? 
            Object.entries(report.parameters)
              .filter(([_, param]) => param.value !== undefined && param.value !== null)
              .map(([key]) => key) : 'no parameters'
        });
        
        // Log any potential issues with the data
        if (report.parameters) {
          Object.entries(report.parameters).forEach(([param, data]) => {
            if (data.value === undefined || data.value === null) {
              console.warn(`⚠️ [Report] Missing value for parameter: ${param}`);
            }
          });
        }

        setReportData({
          ...report,
          generatedAt: new Date().toISOString(),
          timePeriod: activeFilter,
        });
        setError(null);
      } catch (err) {
        // Silent error handling - don't show console logs in UI
        setError({
          message: "Failed to generate report from chart data",
          details: "Data processing error",
        });
      }
    } else if (chartError) {
      setError({
        message: "Failed to fetch chart data",
        details: "Data retrieval error",
      });
    }
  }, [chartData, chartError, activeFilter]);

  useEffect(() => {
    if (
      reportData &&
      reportData.parameters &&
      Object.keys(reportData.parameters).length > 0
    ) {
      const getInsight = async () => {
        setIsGeminiLoading(true);
        setGeminiResponse(null);
        try {
          const insight = await generateInsight(
            reportData,
            "report-overall-insight"
          );
          setGeminiResponse(insight);
        } catch (error) {
          // Silent error handling - don't show console logs in UI
          setGeminiResponse(null);
        } finally {
          setIsGeminiLoading(false);
        }
      };
      getInsight();
    } else {
      setGeminiResponse(null);
    }
  }, [reportData]);

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
        // Silent error handling - don't show console logs in UI
        chartData = { labels: [], datasets: [{ data: [] }] };
      }

      return {
        parameter: config.displayName || key,
        value: (value?.average || 0).toFixed(2),
        unit: config.unit || "",
        safeRange: config.safeRange || "",
        status: value?.status || "normal",
        analysis: value?.trend?.message || "No trend data available",
        minValue: value?.min,
        maxValue: value?.max,
        chartData: {
          labels: chartData?.labels || [],
          datasets: [
            {
              data: chartData?.datasets?.[0]?.data || [],
              colors: Array(chartData?.datasets?.[0]?.data?.length || 0).fill(
                (opacity = 1) => getStatusColor(value?.status || "normal")
              ),
            },
          ],
        },
      };
    }
  );

  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      // Prepare unified export data
      const exportData = prepareExportData(
        reportData,
        processedParameters,
        geminiResponse
      );
      await PdfGenerator(exportData);

      Alert.alert(
        `PDF Report Generated`,
        `Your water quality report has been successfully generated and shared.`,
        [{ text: "OK", style: "cancel" }]
      );
    } catch (error) {
      console.error("PDF Generation Error:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate PDF report. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, [reportData, processedParameters, geminiResponse]);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      // Prepare unified export data
      const exportData = prepareExportData(
        reportData,
        processedParameters,
        geminiResponse
      );
      const { filePath } = await generateCsv(exportData);

      Alert.alert(`CSV Report Generated`, `Report saved to: ${filePath}`, [
        {
          text: "OK",
          onPress: () => shareFiles([filePath], "Share Water Quality Report"),
        },
      ]);
    } catch (error) {
      console.error("CSV Generation Error:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate CSV report. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, [chartData, reportData, processedParameters, geminiResponse]);

  // Render loading state
  if (loading || (chartData === null && !error)) {
    return (
      <>
        <PureFlowLogo
          weather={{
            label: "Loading...",
            temp: "--°C",
            icon: "partly",
          }}
        />
        <SegmentedFilter
          options={timePeriodOptions}
          selectedValue={activeFilter}
          onValueChange={setActiveFilter}
          style={styles.filter}
          disabled={true}
        />
        <GlobalWrapper>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading report data...</Text>
            </View>
          </View>
        </GlobalWrapper>

        <ExportToggleButton
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
        />
      </>
    );
  }

  // Render error state
  if (reportData.status === "error" || error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons
            name="warning-outline"
            size={54}
            color="#ef4444"
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>
            Report Unavailable
          </Text>
          <Text style={styles.errorMessage}>
            {error?.message ||
              reportData.message ||
              "Failed to load report data"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
          {__DEV__ && error?.details && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorDetailsText}>
                {error.details}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <PureFlowLogo
        weather={{
          label: "Light Rain",
          temp: "30°C",
          icon: "partly",
        }}
      />

      <SegmentedFilter
        options={timePeriodOptions}
        selectedValue={activeFilter}
        onValueChange={setActiveFilter}
        style={styles.filter}
      />

      <GlobalWrapper>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={["#3b82f6"]}
            />
          }
        >
          {!loading && chartData && chartData.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No Data Available"
              description="There is no data available to generate the report for the selected time period."
              buttonText="Try Again"
              onPress={onRefresh}
              style={{ marginTop: 60 }}
              iconSize={50}
            />
          ) : (
            <>
              <View style={styles.summaryContainer}>
                <Text style={styles.sectionLabel}>Water Quality Summary</Text>
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

              <View style={styles.parametersContainer}>
                <Text style={styles.sectionLabel}>Key Parameters Report</Text>
                {processedParameters.map((param, index) => {
                  // Filter chartData to only include the relevant parameter
                  const parameterKey = param.parameter.toLowerCase();
                  const sensorData = chartData
                    ? chartData
                        .filter(item => item[parameterKey] !== undefined)
                        .map(item => ({
                          ...item,
                          // Ensure the parameter key matches exactly what's expected
                          [parameterKey]: Number(item[parameterKey]) || 0
                        }))
                    : [];

                  return (
                    <ParameterCard
                      key={param.parameter}
                      parameter={param.parameter}
                      value={param.value}
                      unit={param.unit}
                      safeRange={param.safeRange}
                      status={param.status}
                      analysis={param.analysis}
                      chartData={param.chartData}
                      sensorData={sensorData}
                      minValue={param.minValue}
                      maxValue={param.maxValue}
                    />
                  );
                })}
              </View>

              <View style={styles.insightsContainer}>
                <Text style={styles.sectionLabel}>
                  Quality Report and Recommendation
                </Text>
                {isGeminiLoading ? (
                  <ActivityIndicator
                    style={styles.insightsLoading}
                    color="#3b82f6"
                  />
                ) : geminiResponse ? (
                  <>
                    {/* Overall Insight Card */}
                    <InsightsCard
                      type="info"
                      title="Overall Water Quality Insight"
                      description={
                        geminiResponse?.insights?.overallInsight || ""
                      }
                      timestamp={reportData.generatedAt}
                      componentId="report-overall-insight" // Unique componentId
                      autoRefresh={false} // Insights for report are generated once
                      sensorData={reportData} // Pass the entire reportData for overall insights
                    />
                    {/* Individual Parameter Insight Cards */}
                    {geminiResponse?.suggestions?.map((suggestion, index) => (
                      <InsightsCard
                        key={suggestion.parameter || index}
                        type={suggestion.status}
                        title={`${suggestion.parameter} Parameter Insight`}
                        description={suggestion.recommendation}
                        timestamp={reportData.generatedAt}
                        componentId={`report-param-insight-${suggestion.parameter}`} // Unique componentId
                        autoRefresh={false} // Insights for report are generated once
                        sensorData={suggestion} // Pass individual suggestion for parameter specific insight
                      />
                    ))}
                  </>
                ) : (
                  <Text style={styles.insightsFailedText}>
                    Failed to load insights. Please check your Gemini API quota
                    or try again later.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </GlobalWrapper>

      <ExportToggleButton
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />
    </>
  );
};

const styles = StyleSheet.create({
  filter: {
    position: "absolute",
    top: 100,
    zIndex: 1000,
    left: 15,
    right: 15,
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
  loadingContainer: {
    marginTop: 250,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 24,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorCard: {
    backgroundColor: "#ffeaea",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    shadowColor: "#ef4444",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorIcon: {
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    color: "#b91c1c",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  errorDetailsContainer: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "100%",
  },
  errorDetailsText: {
    fontSize: 12,
    color: "#b91c1c",
    fontFamily: "monospace",
  },
  summaryContainer: {
    marginBottom: 16,
    marginTop: 60,
  },
  parametersContainer: {
    marginBottom: 14,
  },
  insightsContainer: {
    marginBottom: 16,
    marginTop: 10,
  },
  insightsLoading: {
    marginVertical: 20,
  },
  insightsFailedText: {
    fontSize: 16,
    color: "#666",
  },
});
export default ReportScreen;
