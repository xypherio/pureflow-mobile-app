import { getWaterQualityThresholds } from "@constants/thresholds";
import { useOptimizedRealtimeData } from "@contexts/OptimizedDataContext";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const thresholds = getWaterQualityThresholds();

export default function RealTimeData({ data = [] }) {
  const { 
    data: realtimeData, 
    hasData, 
    dataAge, 
    isInitialized,
    getParameterValue,
    getAllParameters 
  } = useOptimizedRealtimeData();

  // Memoized parameters to prevent unnecessary re-renders
  const parameters = useMemo(() => {
    if (!hasData || !realtimeData) {
      return [];
    }

    // Get all parameters at once to prevent multiple function calls
    const allParams = getAllParameters();

    return [
      {
        label: "pH Level",
        value: allParams.pH !== null && allParams.pH !== undefined ? String(allParams.pH) : "--",
        unit: "pH",
        icon: <Gauge size={30} color="#007bff" />,
        color: "#007bff",
        threshold: thresholds["pH"],
        hasData: allParams.pH !== null && allParams.pH !== undefined,
      },
      {
        label: "Temperature",
        value: allParams.temperature !== null && allParams.temperature !== undefined ? String(allParams.temperature) : "--",
        unit: "°C",
        icon: <Thermometer size={30} color="#e83e8c" />,
        color: "#e83e8c",
        threshold: thresholds["temperature"],
        hasData: allParams.temperature !== null && allParams.temperature !== undefined,
      },
      {
        label: "Turbidity",
        value: allParams.turbidity !== null && allParams.turbidity !== undefined ? String(allParams.turbidity) : "--",
        unit: "NTU",
        icon: <Waves size={30} color="#28a745" />,
        color: "#28a745",
        threshold: thresholds["turbidity"],
        hasData: allParams.turbidity !== null && allParams.turbidity !== undefined,
      },
      {
        label: "Salinity",
        value: allParams.salinity !== null && allParams.salinity !== undefined ? String(allParams.salinity) : "--",
        unit: "ppt",
        icon: <Droplet size={30} color="#8b5cf6" />,
        color: "#8b5cf6",
        threshold: thresholds["salinity"],
        hasData: allParams.salinity !== null && allParams.salinity !== undefined,
      },
    ];
  }, [hasData, realtimeData, getAllParameters]);

  // Show loading state if data is still initializing
  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Initializing real-time data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.parametersContainer}>
        {parameters.map((param, index) => (
          <ParameterCard key={`${param.label}-${index}`} param={param} />
        ))}
      </View>
    </View>
  );
}

// Memoized parameter card component for better performance
const ParameterCard = React.memo(({ param }) => (
  <View style={styles.parameterCard}>
    <View>
      {param.icon}
      <View style={styles.iconValueContainer}>
        <Text
          style={[param.hasData ? styles.valueText : styles.valueTextNoData, {
            color: param.color,
          }]}
        >
          {param.value}
        </Text>
        <Text
          style={[param.hasData ? styles.unitText : styles.unitTextNoData, {
            color: param.color,
          }]}
        >
          {param.unit}
        </Text>
      </View>
    </View>
    <Text style={styles.labelText}>
      {param.label}
    </Text>
    {param.threshold && param.threshold.min !== undefined && param.threshold.max !== undefined && (
      <Text style={styles.thresholdText}>
        Normal range: {param.threshold.min} - {param.threshold.max}
      </Text>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2455a9",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  lastRefreshText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
  },
  parametersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
  },
  parameterCard: {
    backgroundColor: "#f6fafd",
    borderRadius: 12,
    padding: 12,
    height: 160,
    flexBasis: "48%",
    flexShrink: 0,
    justifyContent: "space-between",
  },
  iconValueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8
  },
  valueText: {
    fontSize: 50,
    fontWeight: "bold",
    marginRight: 4,
  },
  valueTextNoData: {
    fontSize: 40,
    fontWeight: "normal",
    marginRight: 4,
    opacity: 0.5,
  },
  unitText: {
    fontSize: 20,
    fontWeight: "bold",
    paddingBottom: 10,
  },
  unitTextNoData: {
    fontSize: 18,
    fontWeight: "normal",
    paddingBottom: 10,
    opacity: 0.5,
  },
  labelText: {
    color: "#224882",
    fontSize: 14,
    marginTop: 2,
  },
  thresholdText: {
    color: "rgb(36, 85, 169, 0.2)",
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic",
  },
});
