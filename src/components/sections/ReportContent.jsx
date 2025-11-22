import { PARAMETER_CONFIG } from "@constants/report";
import InsightsCard from "@dataDisplay/InsightsCard";
import ParameterCard from "@dataDisplay/ParameterCard";
import WaterQualitySummaryCard from "@dataDisplay/WaterQualitySummaryCard";
import EmptyState from "@ui/EmptyState";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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

  const navigateToDashboard = () => {
    router.push("/");
  };

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
              <View style={styles.noParametersContainer}>
                <Text style={styles.noParametersText}>
                  No report available for now, come back later
                </Text>
              </View>
            )}
          </View>

          <View style={styles.insightsContainer}>
            <Text style={styles.sectionLabel}>
              AI Recommendations
            </Text>
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
    shadowColor: "#2569d0",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    marginBottom: 8,
  },
  noParametersContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noParametersText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default ReportContent;
