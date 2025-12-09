import { PARAMETER_CONFIG } from "@constants/report";
import InsightsCard from "@dataDisplay/InsightsCard";
import ParameterCard from "@dataDisplay/ParameterCard";
import WaterQualitySummaryCard from "@dataDisplay/WaterQualitySummaryCard";
import { useRouter } from "expo-router";
import { AlertTriangle, History } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles } from "../../styles/globalStyles";

// Report fallback functions
const generateReportInsightFallback = (reportData) => {
  if (!reportData || !reportData.parameters) {
    return {
      overallInsight:
        "Report data is being analyzed for water quality insights.",
      source: "report-fallback",
    };
  }

  const parameters = Object.entries(reportData.parameters || {});
  const wqi = reportData.wqi?.overall || 0;
  const wqiRating = reportData.wqi?.rating?.level || "unknown";
  const overallStatus = reportData.overallStatus || "normal";

  // Count parameter statuses
  const statusCounts = { normal: 0, warning: 0, critical: 0 };
  const parameterStatuses = [];

  parameters.forEach(([key, data]) => {
    const status = data.status || "normal";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    if (status !== "normal") {
      parameterStatuses.push({ param: key, status, value: data.average });
    }
  });

  // Generate insight based on WQI and parameter health (farmer-friendly language)
  let insight = "";

  if (
    wqiRating === "excellent" &&
    statusCounts.critical === 0 &&
    statusCounts.warning === 0
  ) {
    insight = `Excellent water quality with WQI score of ${wqi}. All parameters are within optimal ranges, showing healthy conditions for your fish.`;
  } else if (wqiRating === "good" && statusCounts.critical === 0) {
    insight = `Good water quality with WQI score of ${wqi}. Some parameters are approaching limits but remain within acceptable ranges for fish health.`;
  } else if (wqiRating === "fair" || statusCounts.warning > 0) {
    insight = `Fair water quality with WQI score of ${wqi}. ${statusCounts.warning} parameters need watching. Keep maintaining good conditions.`;
  } else if (wqiRating === "poor" || statusCounts.critical > 0) {
    insight = `Poor water quality with WQI score of ${wqi}. ${statusCounts.critical} parameters need immediate action to keep fish healthy.`;
  } else {
    insight = `Water quality status: ${wqiRating} with WQI score of ${wqi}. Watch all parameters closely to keep fish in good conditions.`;
  }

  return {
    overallInsight: insight,
    source: "report-fallback",
    wqi: wqi,
    wqiRating: wqiRating,
    parameterSummary: statusCounts,
  };
};

const generateParameterInsightFallback = (
  parameterName,
  parameterStatus,
  averageValue
) => {
  const paramKey = parameterName.toLowerCase();

  // Status messages for different parameter types and levels (farmer-friendly, no jargon)
  const statusMessages = {
    ph: {
      critical: {
        low: `pH critically low at ${averageValue?.toFixed(1)}. Add baking soda immediately to raise it.`,
        high: `pH critically high at ${averageValue?.toFixed(1)}. Add vinegar or acid to lower it right away.`,
      },
      warning: {
        low: `pH getting low at ${averageValue?.toFixed(1)}. Add baking soda if it keeps dropping.`,
        high: `pH getting high at ${averageValue?.toFixed(1)}. Add vinegar if it keeps rising.`,
      },
      normal: `pH level good at ${averageValue?.toFixed(1)}. Conditions are right for healthy fish.`,
    },
    temperature: {
      critical: {
        low: `Water temperature very low at ${averageValue?.toFixed(1)}°C. Heat water or give fish more protection immediately.`,
        high: `Water temperature very high at ${averageValue?.toFixed(1)}°C. Cool water down right away or add shade.`,
      },
      warning: {
        low: `Water temperature low at ${averageValue?.toFixed(1)}°C. Keep an eye on it and protect fish if needed.`,
        high: `Water temperature high at ${averageValue?.toFixed(1)}°C. Watch closely and add shade if needed.`,
      },
      normal: `Water temperature good at ${averageValue?.toFixed(1)}°C. Perfect for fish health and activity.`,
    },
    salinity: {
      critical: {
        low: `Salt level very low at ${averageValue?.toFixed(1)}. Add salt immediately.`,
        high: `Salt level very high at ${averageValue?.toFixed(1)}. Change some water to reduce salt right away.`,
      },
      warning: {
        low: `Salt level getting low at ${averageValue?.toFixed(1)}. Add salt gradually if needed.`,
        high: `Salt level getting high at ${averageValue?.toFixed(1)}. Change some water if it keeps rising.`,
      },
      normal: `Salt level balanced at ${averageValue?.toFixed(1)}. Good for fish body water balance.`,
    },
    turbidity: {
      critical: {
        low: `Water too clear at ${averageValue?.toFixed(1)} - could grow too much algae. Add some natural balance.`,
        high: `Water too cloudy at ${averageValue?.toFixed(1)}. Change water or clean filters immediately.`,
      },
      warning: {
        low: `Water very clear at ${averageValue?.toFixed(1)}. Watch for possible algae growth.`,
        high: `Water getting cloudy at ${averageValue?.toFixed(1)}. Clean filters soon and feed less if needed.`,
      },
      normal: `Water clarity good at ${averageValue?.toFixed(1)}. Clear enough for healthy fish and plants.`,
    },
  };

  // Find which parameter config matches
  let matchedMessages = null;
  Object.keys(statusMessages).forEach((key) => {
    if (
      parameterName.toLowerCase().includes(key) ||
      key.includes(parameterName.toLowerCase()) ||
      key === parameterName.toLowerCase()
    ) {
      matchedMessages = statusMessages[key];
    }
  });

  if (!matchedMessages) {
    // Generic fallback
    return `${parameterName} at ${parameterStatus} level with average value of ${averageValue?.toFixed(1) || "N/A"}. Monitor closely for optimal conditions.`;
  }

  // Return status-specific message
  if (parameterStatus === "normal") {
    return matchedMessages.normal;
  }

  // For warning/critical, determine if high or low based on parameter-specific logic
  let isLow = false;

  // Parameter-specific logic to determine high vs low
  switch (paramKey) {
    case "ph":
      // pH normal range around 7, lower values are more acidic
      isLow = averageValue < 7;
      break;
    case "temperature":
      // Temperature normal range around 26-30°C for aquaculture
      isLow = averageValue < 28;
      break;
    case "salinity":
      // Salinity normal range for freshwater: 0-5, saltwater: 15-35
      isLow =
        paramKey === "temperature-salinity" || paramKey === "salinity"
          ? averageValue < 20
          : averageValue < 3;
      break;
    case "turbidity":
      // Turbidity lower than 25 NTU might be too clear, higher is cloudy
      isLow = averageValue < 25;
      break;
    default:
      isLow = true; // Default assumption
      break;
  }

  if (parameterStatus === "warning") {
    return matchedMessages.warning[isLow ? "low" : "high"];
  } else if (parameterStatus === "critical") {
    return matchedMessages.critical[isLow ? "low" : "high"];
  }

  return `${parameterName} status: ${parameterStatus}. Average value: ${averageValue?.toFixed(1) || "N/A"}`;
};

const ReportContent = ({
  reportData,
  processedParameters,
  geminiResponse,
  isGeminiLoading,
  isSwitchingFilter,
  loading,
  onRefresh,
  getParameterInsight,
  activeFilter = "daily",
}) => {
  const router = useRouter();

  console.log("📊 [ReportContent] Rendering with data:", {
    activeFilter,
    isLoading: loading,
    reportDataKeys: Object.keys(reportData || {}),
    reportDataLength: Object.keys(reportData || {}).length,
    processedParametersLength: processedParameters?.length || 0,
    processedParametersSample: processedParameters?.[0]
      ? {
          parameter: processedParameters[0].parameter,
          averageValue: processedParameters[0].averageValue,
          hasChartData:
            processedParameters[0]?.chartData?.datasets?.[0]?.data?.length > 0,
        }
      : null,
    reportHasParameters: !!(
      reportData?.parameters && Object.keys(reportData.parameters).length > 0
    ),
    isSwitchingFilter,
  });

  const navigateToDashboard = () => {
    router.push("/");
  };

  const EmptyState = ({
    icon,
    title,
    description,
    buttonText,
    onPress,
    style,
    iconSize = 48,
    iconColor = "#3b82f6",
  }) => (
    <View style={[styles.emptyStateContainer, style]}>
      <View style={[styles.emptyStateIcon, { backgroundColor: "#dbeafe" }]}>
        <AlertTriangle size={iconSize} color={iconColor} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDescription}>{description}</Text>
      {buttonText && onPress && (
        <TouchableOpacity style={styles.emptyStateButton} onPress={onPress}>
          <Text style={styles.emptyStateButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={["#3b82f6"]}
        />
      }
    >
      {!loading && reportData && Object.keys(reportData).length === 0 ? (
        <EmptyState
          icon="water-outline"
          title={`No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Reports Available`}
          description="Reports show pH, temperature, salinity, turbidity, and TDS trends to help maintain healthy water conditions. Check back when sensors have collected data for this period."
          buttonText="Check Later"
          onPress={navigateToDashboard}
          style={{ marginTop: 60 }}
          iconSize={60}
          iconColor="#3b82f6"
        />
      ) : (
        <>
          {/* Water Quality Summary */}
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
                  value:
                    typeof value?.average === "number" &&
                    Number.isFinite(value.average)
                      ? value.average
                      : null,
                  status: value.status || "normal",
                  unit: PARAMETER_CONFIG[key]?.unit || "",
                })
              )}
              wqi={{
                value: reportData.wqi?.overall || 0,
                status: reportData.wqi?.rating?.level || "unknown",
              }}
            />
          </View>

          {/* Key Parameters Report */}
          <View style={styles.parametersContainer}>
            <Text style={styles.sectionLabel}>Key Parameters Report</Text>
            {processedParameters && processedParameters.length > 0 ? (
              processedParameters.map((param) => (
                <ParameterCard
                  key={param.parameter}
                  parameter={param.parameter}
                  value={param.value}
                  unit={param.unit}
                  safeRange={param.safeRange}
                  status={param.status}
                  analysis={param.analysis}
                  chartData={param.chartData}
                  minValue={param.minValue}
                  maxValue={param.maxValue}
                  insight={getParameterInsight(param.parameter)}
                />
              ))
            ) : (
              <View style={styles.noParametersCard}>
                <View style={styles.noParametersHeader}>
                  <View
                    style={[
                      styles.noParametersIcon,
                      { backgroundColor: "#dbeafe" },
                    ]}
                  >
                    <History size={28} color="#3b82f6" />
                  </View>
                  <View style={styles.noParametersHeaderText}>
                    <Text style={styles.noParametersTitle}>
                      Parameters Unavailable
                    </Text>
                    <Text style={styles.noParametersSubtitle}>
                      Waiting for sensor data to generate parameter report
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.noParametersBanner,
                    { backgroundColor: "#dbeafe" },
                  ]}
                >
                  <Text
                    style={[styles.noParametersStatus, { color: "#3b82f6" }]}
                  >
                    Data Collection Pending
                  </Text>
                  <Text style={styles.noParametersDescription}>
                    Sensors are collecting initial data. Parameters will appear
                    soon.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Gemini Insights */}
          {reportData &&
            Object.keys(reportData.parameters || {}).length > 0 &&
            processedParameters &&
            processedParameters.length > 0 && (
              <View style={styles.insightsContainer}>
                {isGeminiLoading ? (
                  <ActivityIndicator
                    style={styles.insightsLoading}
                    color="#3b82f6"
                  />
                ) : geminiResponse ? (
                  <InsightsCard
                    type="info"
                    title="Overall Water Quality Insight"
                    description={geminiResponse?.insights?.overallInsight || ""}
                    recommendations={(
                      geminiResponse?.suggestions?.flatMap(
                        (s) => s.recommendedActions
                      ) || []
                    ).slice(0, 5)}
                    timestamp={reportData.generatedAt}
                    componentId="report-overall-insight"
                    autoRefresh={false}
                    sensorData={reportData}
                  />
                ) : (
                  // Generate fallback insights based on WQI and parameter statuses
                  !isSwitchingFilter &&
                  (() => {
                    const fallbackInsight =
                      generateReportInsightFallback(reportData);
                    return (
                      <InsightsCard
                        type="info"
                        title="Overall Water Quality Insight"
                        description={fallbackInsight.overallInsight}
                        recommendations={processedParameters
                          .filter((p) => p.status !== "normal")
                          .slice(0, 3)
                          .map(
                            (p) =>
                              `${p.parameter} needs attention - ${p.status} status`
                          )}
                        timestamp={reportData.generatedAt}
                        componentId="report-fallback-insight"
                        autoRefresh={false}
                        sensorData={reportData}
                      />
                    );
                  })()
                )}
              </View>
            )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  insightsErrorContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 10,
  },
  insightsErrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  insightsErrorIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  insightsErrorHeaderText: {
    flex: 1,
  },
  insightsErrorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  insightsErrorSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  insightsErrorBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  insightsErrorStatus: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  insightsErrorDescription: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  insightsFailedText: {
    fontSize: 16,
    color: "#666",
  },
  sectionLabel: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 10,
  },
  noParametersCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 10,
    ...globalStyles.boxShadow,
  },
  noParametersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  noParametersIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  noParametersHeaderText: {
    flex: 1,
  },
  noParametersTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  noParametersSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  noParametersBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noParametersStatus: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  noParametersDescription: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ReportContent;
