import AlertsCard from "@dataDisplay/AlertsCard";
import LineChartCard from "@dataDisplay/LinechartCard";
import RealtimeDataCards from "@dataDisplay/RealtimeDataCards";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Main dashboard section with alerts, real-time data, and historical trends
 * @param {Object} props - Component props
 * @param {Array} props.activeAlerts - Active alerts generated from current realtime data
 * @param {Object} props.realtimeData - Real-time sensor data
 * @param {Object} props.sensorData - Historical sensor data
 */
const DashboardSection = ({ activeAlerts, realtimeData, sensorData }) => {
  return (
    <View style={styles.container}>
      {/* Critical Alerts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Active Alerts</Text>
        <AlertsCard
          alerts={activeAlerts}
          realtimeData={realtimeData}
        />
      </View>

      {/* Real-Time Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Water Parameters</Text>
        <RealtimeDataCards data={sensorData} />
      </View>

      {/* Historical Trends Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabelNoMargin}>Daily Trends</Text>
        <LineChartCard />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 10,
  },
  sectionLabelNoMargin: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: -10,
  },
});

export default React.memo(DashboardSection);
