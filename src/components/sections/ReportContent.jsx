import { PARAMETER_CONFIG } from "@constants/report";
import InsightsCard from "@dataDisplay/InsightsCard";
import ParameterCard from "@dataDisplay/ParameterCard";
import WaterQualitySummaryCard from "@dataDisplay/WaterQualitySummaryCard";
import { useRouter } from "expo-router";
import { AlertCircle, AlertTriangle, History } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { globalStyles } from "../../styles/globalStyles";

const ReportContent = ({
  reportData,
  processedParameters,
  geminiResponse,
  isGeminiLoading,
  isSwitchingFilter,
  loading,
  onRefresh,
  getParameterInsight,
  activeFilter = "daily"
}) => {
  const router = useRouter();

  console.log('📊 [ReportContent] Rendering with data:', {
    activeFilter,
    isLoading: loading,
    reportDataKeys: Object.keys(reportData || {}),
    reportDataLength: Object.keys(reportData || {}).length,
    processedParametersLength: processedParameters?.length || 0,
    processedParametersSample: processedParameters?.[0] ? {
      parameter: processedParameters[0].parameter,
      averageValue: processedParameters[0].averageValue,
      hasChartData: processedParameters[0]?.chartData?.datasets?.[0]?.data?.length > 0
    } : null,
    reportHasParameters: !!(reportData?.parameters && Object.keys(reportData.parameters).length > 0),
    isSwitchingFilter
  });

  const navigateToDashboard = () => {
    router.push("/");
  };

  const EmptyState = ({ icon, title, description, buttonText, onPress, style, iconSize = 48, iconColor = "#3b82f6" }) => (
    <View style={[styles.emptyStateContainer, style]}>
      <View style={[styles.emptyStateIcon, { backgroundColor: '#dbeafe' }]}>
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
                  <View style={[styles.noParametersIcon, { backgroundColor: '#dbeafe' }]}>
                    <History size={28} color="#3b82f6" />
                  </View>
                  <View style={styles.noParametersHeaderText}>
                    <Text style={styles.noParametersTitle}>Parameters Unavailable</Text>
                    <Text style={styles.noParametersSubtitle}>Waiting for sensor data to generate parameter report</Text>
                  </View>
                </View>

                <View style={[styles.noParametersBanner, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.noParametersStatus, { color: '#3b82f6' }]}>
                    Data Collection Pending
                  </Text>
                  <Text style={styles.noParametersDescription}>
                    Sensors are collecting initial data. Parameters will appear soon.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {reportData && Object.keys(reportData.parameters || {}).length > 0 && processedParameters && processedParameters.length > 0 && (
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
                  description={
                    geminiResponse?.insights?.overallInsight || ""
                  }
                  recommendations={
                    (geminiResponse?.suggestions?.flatMap(s => s.recommendedActions) || []).slice(0, 5)
                  }
                  timestamp={reportData.generatedAt}
                  componentId="report-overall-insight"
                  autoRefresh={false}
                  sensorData={reportData}
                />
              ) : (
                // Only show error message if we're not actively switching filters
                !isSwitchingFilter && (
                  <View style={styles.insightsErrorContainer}>
                    <View style={styles.insightsErrorHeader}>
                      <View style={[styles.insightsErrorIcon, { backgroundColor: '#FFFBEB' }]}>
                        <AlertCircle size={28} color="#D97706" />
                      </View>
                      <View style={styles.insightsErrorHeaderText}>
                        <Text style={styles.insightsErrorTitle}>AI Insights Unavailable</Text>
                        <Text style={styles.insightsErrorSubtitle}>Unable to generate recommendations</Text>
                      </View>
                    </View>

                    <View style={[styles.insightsErrorBanner, { backgroundColor: '#FFFBEB' }]}>
                      <Text style={[styles.insightsErrorStatus, { color: '#D97706' }]}>
                        Service Unavailable
                      </Text>
                      <Text style={styles.insightsErrorDescription}>
                        Unable to generate AI recommendations at this time. Please try again later.
                      </Text>
                    </View>
                  </View>
                )
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportContent;
