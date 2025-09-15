
import ExportToggleButton from "@components/forms/ExportToggleButton";
import PureFlowLogo from "@components/ui/UiHeader";
import InsightsCard from "@dataDisplay/InsightsCard";
import ParameterCard from "@dataDisplay/ParameterCard";
import WaterQualitySummaryCard from "@dataDisplay/WaterQualitySummaryCard";
import { Ionicons } from "@expo/vector-icons";
import { useChartData } from "@hooks/useChartData";
import SegmentedFilter from "@navigation/SegmentedFilters";
import { generateInsight } from "@services/ai/geminiAPI";
import EmptyState from "@ui/EmptyState";
import GlobalWrapper from "@ui/GlobalWrapper";
import { generateCsv, shareFiles } from "@utils/exportUtils"; // Import new functions
import { generateWaterQualityReport, prepareChartData } from "@utils/reportUtils";
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
import PdfGenerator from '../../src/PdfGenerator';

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
      console.log('Raw chart data sample:', chartData[0]);
      console.log('All pH values:', chartData.map(item => ({
        pH: item.pH,
        datetime: item.datetime,
        hasPH: 'pH' in item,
        keys: Object.keys(item)
      })));
    }
  }, [chartData]);

  // Process the data when chartData changes
  useEffect(() => {
    // Only process if we have chartData and we're not already in a loading state
    if (chartData && !loading) {
      try {
        if (chartData.length === 0) {
          console.log('No data available for the selected time period');
          // Set empty state but keep the tab structure
          setReportData({
            wqi: { value: 0, status: "unknown" },
            parameters: {},
            status: "empty",
            message: "No data available for the selected time period",
            generatedAt: new Date().toISOString(),
            overallStatus: "unknown"
          });
          setError(null);
          return;
        }

        console.log("Processing chart data for report:", {
          dataLength: chartData.length,
          sampleData: chartData[0],
        });

        // Generate report using the data from useChartData
        const report = generateWaterQualityReport(chartData, activeFilter);
        
        console.log("Generated report data:", report);
        console.log("pH value in report:", report.parameters?.pH || report.parameters?.['pH Value']);

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

  useEffect(() => {
    if (reportData && reportData.parameters && Object.keys(reportData.parameters).length > 0) {
      const getInsight = async () => {
        setIsGeminiLoading(true);
        setGeminiResponse(null);
        try {
          const insight = await generateInsight(reportData, "report-overall-insight"); // Pass reportData and unique componentId
          setGeminiResponse(insight);
          console.log("Gemini API Response:", insight);
        } catch (error) {
          console.error("Error fetching Gemini insight:", error);
          setGeminiResponse(null); // Or some error object
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
        console.error("Error preparing chart data:", err);
      }

      return {
        parameter: config.displayName || key,
        value: (value.average || 0).toFixed(2),
        unit: config.unit || "",
        safeRange: config.safeRange || "",
        status: value.status || "normal",
        analysis: value.trend?.message || "No trend data available",
        minValue: value.min,
        maxValue: value.max,
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

  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Removed the generateAndHandleReport function as it's no longer needed.

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      // Construct the report data for PdfGenerator
      const pdfReportData = {
        overallStatus: reportData.overallStatus || "No overall status available.",
        ph: {
          value: reportData.parameters?.pH?.average?.toFixed(2) || "N/A",
          status: reportData.parameters?.pH?.status || "unknown",
          details: reportData.parameters?.pH?.trend?.message || "No pH details available.",
        },
        temperature: {
          value: reportData.parameters?.temperature?.average?.toFixed(2) || "N/A",
          status: reportData.parameters?.temperature?.status || "unknown",
          details: reportData.parameters?.temperature?.trend?.message || "No temperature details available.",
        },
        turbidity: {
          value: reportData.parameters?.turbidity?.average?.toFixed(2) || "N/A",
          status: reportData.parameters?.turbidity?.status || "unknown",
          details: reportData.parameters?.turbidity?.trend?.message || "No turbidity details available.",
        },
        salinity: {
          value: reportData.parameters?.salinity?.average?.toFixed(2) || "N/A",
          status: reportData.parameters?.salinity?.status || "unknown",
          details: reportData.parameters?.salinity?.trend?.message || "No salinity details available.",
        },
        tds: {
          value: reportData.parameters?.tds?.average?.toFixed(2) || "N/A",
          status: reportData.parameters?.tds?.status || "unknown",
          details: reportData.parameters?.tds?.trend?.message || "No TDS details available.",
        },
        aiInsights: geminiResponse?.insights?.overallInsight || "No AI insights available.",
        forecast: geminiResponse?.forecast?.overallForecast || "No forecast available.", // Assuming forecast is part of geminiResponse
      };

      await PdfGenerator(pdfReportData);
      Alert.alert(
        `PDF Report Generated`,
        `Your water quality report has been successfully generated and shared.`,
        [
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("PDF generation failed:", error);
      Alert.alert("Export Failed", error.message);
    } finally {
      setIsExporting(false);
    }
  }, [reportData, geminiResponse]);

  // New CSV export handler
  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const insightsForReport = geminiResponse?.insights?.overallInsight || "No AI insights available.";
      const { filePath } = await generateCsv(
        chartData,
        processedParameters,
        insightsForReport
      );

      Alert.alert(
        `CSV Report Generated`,
        `Report saved to: ${filePath}`,
        [
          {
            text: "OK",
            onPress: () => shareFiles([filePath], "Share Water Quality Report"), // Offer to share
          },
        ]
      );
    } catch (error) {
      console.error("CSV Report generation failed:", error);
      Alert.alert("Export Failed", error.message);
    } finally {
      setIsExporting(false);
    }
  }, [chartData, processedParameters, geminiResponse]);

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
              <View style={{ marginBottom: 16, marginTop: 70 }}>
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
                  <ParameterCard
                    key={param.parameter}
                    parameter={param.parameter}
                    value={param.value}
                    unit={param.unit}
                    safeRange={param.safeRange}
                    status={param.status}
                    analysis={param.analysis}
                    chartData={param.chartData}
                  />
                ))}
              </View>

              <View style={{ marginBottom: 16, marginTop: 10 }}>
                <Text style={sectionLabelStyle}>
                  Quality Report and Recommendation
                </Text>
                {isGeminiLoading ? (
                  <ActivityIndicator style={{ marginVertical: 20 }} color="#3b82f6" />
                ) : geminiResponse ? (
                  <>
                    {/* Overall Insight Card */}
                    <InsightsCard
                      type="info"
                      title="Overall Water Quality Insight"
                      description={geminiResponse?.insights?.overallInsight || ""}
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
                  <Text>Failed to load insights. Please check your Gemini API quota or try again later.</Text>
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
});
export default ReportScreen;

