import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Components
import InsightsCard from "@dataDisplay/InsightsCard";

const ForecastInsights = ({
  isGeminiLoading,
  geminiResponse,
  forecastDataAvailable,
  forecastPredicted
}) => {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.insightsHeader}>
        <Text style={styles.sectionTitle}>Insights & Suggestions</Text>
      </View>

      {isGeminiLoading ? (
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
        />
      ) : (
        <Text style={styles.noDataText}>
          {forecastDataAvailable
            ? "Failed to load forecast insights. Please check your Gemini API quota or try again later."
            : "No forecast available yet."}
        </Text>
      )}
    </View>
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
