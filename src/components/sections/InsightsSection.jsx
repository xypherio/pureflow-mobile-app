import React from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import InsightsCard from "@dataDisplay/InsightsCard";

/**
 * Section displaying AI insights and recommendations
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.realtimeData - Real-time sensor data
 * @param {Date} props.lastUpdate - Last data update timestamp
 */
const InsightsSection = ({ loading, realtimeData, lastUpdate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.insightsLabel}>Insights & Recommendations</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4a90e2"
          style={styles.loadingIndicator}
        />
      ) : (
        <InsightsCard
          type="info"
          title="Water Quality Insights"
          sensorData={realtimeData}
          timestamp={lastUpdate}
          componentId="home-insights"
          autoRefresh={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  insightsLabel: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 5,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default React.memo(InsightsSection);
