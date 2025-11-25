import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Components
import InsightsCard from "@dataDisplay/InsightsCard";
import { ForecastInsightsSkeleton } from "@ui/LoadingSkeletons";

const ForecastInsights = ({
  isGeminiLoading,
  geminiResponse,
  forecastDataAvailable,
  forecastPredicted
}) => {
  return isGeminiLoading ? (
    <ActivityIndicator
      size="large"
      color="#4a90e2"
      style={styles.loadingIndicator}
    />
  ) : geminiResponse ? (
    <InsightsCard
      type="info"
      title="Overall Forecast Insight"
      description={geminiResponse?.insights?.overallInsight || ""}
      timestamp={geminiResponse?.insights?.timestamp}
      componentId="forecast-overall-insight"
      autoRefresh={true}
      sensorData={forecastPredicted}
      sectionTitle="Insights & Suggestions"
    />
  ) : (
    <ForecastInsightsSkeleton />
  );
};

const styles = StyleSheet.create({
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51",
    fontWeight: "600",
    marginBottom: 8,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  noDataText: {
    color: "#856404",
    fontSize: 12,
    textAlign: "center",
  },
});

export default ForecastInsights;
