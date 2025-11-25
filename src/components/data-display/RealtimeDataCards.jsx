import { useData } from "@contexts/DataContext";
import { LinearGradient } from "expo-linear-gradient";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WaterQualityThresholdManager } from "../../services/core/WaterQualityThresholdManager";
import waterQualityNotificationService from "../../services/WaterQualityNotificationService";

const thresholdManager = new WaterQualityThresholdManager();

// Parameter configuration
const PARAMETER_CONFIGS = [
  { key: "pH", label: "pH Level", unit: "PH", icon: Gauge, color: "#007bff" },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    icon: Thermometer,
    color: "#e83e8c",
  },
  {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    icon: Waves,
    color: "#28a745",
  },
  {
    key: "salinity",
    label: "Salinity",
    unit: "PPT",
    icon: Droplet,
    color: "#8b5cf6",
  },
];

export default function RealTimeData() {
  const { realtimeData, loading } = useData();

  // Calculate data age - handle both timestamp formats
  const dataAge = useMemo(() => {
    if (!realtimeData) return "No data";

    // Handle different timestamp formats
    let dataTime = null;
    if (realtimeData.timestamp) {
      dataTime = new Date(realtimeData.timestamp).getTime();
    } else if (realtimeData.datetime) {
      dataTime = new Date(realtimeData.datetime).getTime();
    } else if (realtimeData.reading?.timestamp) {
      dataTime = new Date(realtimeData.reading.timestamp).getTime();
    } else if (realtimeData.reading?.datetime) {
      dataTime = new Date(realtimeData.reading.datetime).getTime();
    }

    if (!dataTime || isNaN(dataTime)) return "No data";

    const now = Date.now();
    const ageSeconds = Math.floor((now - dataTime) / 1000);

    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  }, [realtimeData]);

  // Check if we have valid data with any sensor readings
  const hasData =
    realtimeData &&
    (realtimeData.pH !== undefined ||
      realtimeData.temperature !== undefined ||
      realtimeData.turbidity !== undefined ||
      realtimeData.salinity !== undefined ||
      realtimeData.reading?.pH !== undefined ||
      realtimeData.reading?.temperature !== undefined ||
      realtimeData.reading?.turbidity !== undefined ||
      realtimeData.reading?.salinity !== undefined);

  // Track last processed data for notification triggering
  const lastProcessedRef = useRef(null);

  // Trigger notifications for fresh data
  useEffect(() => {
    if (realtimeData && hasData && realtimeData !== lastProcessedRef.current) {
      const sensorData = realtimeData.reading || realtimeData;
      waterQualityNotificationService.processSensorData(sensorData);
      lastProcessedRef.current = realtimeData;
    }
  }, [realtimeData, hasData]);

  // Memoized parameters to prevent unnecessary re-renders
  const parameters = useMemo(() => {
    if (!hasData || !realtimeData) return [];

    // Handle different data structures - some might have nested 'reading' property
    const sensorData = realtimeData.reading || realtimeData;

    return PARAMETER_CONFIGS.map(({ key, label, unit, icon: Icon, color }) => {
      const value = sensorData[key];
      const hasValidValue = value != null && !isNaN(value);

      // Calculate threshold status using the same logic as alert system
      const thresholdStatus = hasValidValue ? thresholdManager.evaluateValue(key, Number(value)) : "normal";

      return {
        label,
        value: hasValidValue ? Number(value).toFixed(1) : "--",
        unit,
        icon: <Icon size={30} color={color} />,
        color,
        threshold: thresholdManager.getThreshold(key),
        hasData: hasValidValue,
        thresholdStatus, // Add threshold status for styling
      };
    });
  }, [hasData, realtimeData]);

  // Show loading state only if actively loading
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading real-time data...</Text>
      </View>
    );
  }

  // Show no data state if no data is available
  if (!hasData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>No real-time data available</Text>
        <Text style={styles.dataAgeText}>
          Please check your connection and try again
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.parametersContainer}>
        {parameters.length > 0 ? (
          parameters.map((param, index) => (
            <ParameterCard key={`${param.label}-${index}`} param={param} />
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No sensor data available</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Memoized parameter card component for better performance
const ParameterCard = React.memo(({ param }) => {
  const isWarning = param.thresholdStatus === "warning";
  const isCritical = param.thresholdStatus === "critical";

  // Define gradient colors: white to main tint
  const getGradientColors = () => {
    if (isWarning) {
      return ["#ffffff", "#feecc7"]; 
    }
    if (isCritical) {
      return ["#ffffff", "#fecdcf"]; 
    }
    return ["#e5f0f9", "#c2e3fb"];
  };

  const WrappedCard = ({ children }) => {
    if (isWarning || isCritical) {
      return (
        <LinearGradient
          colors={getGradientColors()}
          style={[styles.parameterCard, styles.parameterCardGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {children}
        </LinearGradient>
      );
    }
    return <View style={styles.parameterCard}>{children}</View>;
  };

  return (
    <WrappedCard>
      <View>
        {param.icon}
        <View style={styles.iconValueContainer}>
          <Text
            style={[
              param.hasData ? styles.valueText : styles.valueTextNoData,
              {
                color: param.color,
              },
            ]}
          >
            {param.value}
          </Text>
          <Text
            style={[
              param.hasData ? styles.unitText : styles.unitTextNoData,
              {
                color: param.color,
              },
            ]}
          >
            {param.unit}
          </Text>
        </View>
      </View>
      <Text style={styles.labelText}>{param.label}</Text>
      {param.threshold &&
        param.threshold.min !== undefined &&
        param.threshold.max !== undefined && (
          <Text style={styles.thresholdText}>
            Normal range: {param.threshold.min} - {param.threshold.max}
          </Text>
        )}
    </WrappedCard>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2455a9",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
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
  dataAgeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
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
  parameterCardGradient: {
    borderRadius: 12,
  },
  iconValueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  valueText: {
    fontSize: 45,
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
    color: "rgb(36, 85, 169, 0.1)",
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic",
  },
  noDataContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
  },
});
