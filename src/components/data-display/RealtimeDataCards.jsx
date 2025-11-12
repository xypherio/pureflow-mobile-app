import { getWaterQualityThresholds } from "@constants/thresholds";
import { useData } from "@contexts/DataContext";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const thresholds = getWaterQualityThresholds();

export default function RealTimeData({ data = [] }) {
  const { 
    realtimeData, 
    loading, 
    refreshData,
    lastUpdate
  } = useData();

  // Debug logging to understand what data we're receiving
  useEffect(() => {
    console.log('🔍 RealtimeDataCards Debug Info:', {
      realtimeData,
      loading,
      lastUpdate,
      hasRealtimeData: !!realtimeData,
      realtimeDataType: typeof realtimeData,
      realtimeDataKeys: realtimeData ? Object.keys(realtimeData) : [],
      realtimeDataStructure: realtimeData ? {
        pH: realtimeData.pH || realtimeData.reading?.pH,
        temperature: realtimeData.temperature || realtimeData.reading?.temperature,
        turbidity: realtimeData.turbidity || realtimeData.reading?.turbidity,
        salinity: realtimeData.salinity || realtimeData.reading?.salinity,
        timestamp: realtimeData.timestamp || realtimeData.reading?.timestamp,
        datetime: realtimeData.datetime || realtimeData.reading?.datetime,
        hasReadingProperty: !!realtimeData.reading
      } : null
    });
  }, [realtimeData, loading, lastUpdate]);

  // Note: Real-time data refresh is now handled automatically by DataContext every 30 seconds
  // No need for manual refresh interval here - DataContext will update realtimeData automatically

  // Calculate data age - handle both timestamp formats
  const dataAge = useMemo(() => {
    if (!realtimeData) return 'No data';
    
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
    
    if (!dataTime || isNaN(dataTime)) return 'No data';
    
    const now = Date.now();
    const ageSeconds = Math.floor((now - dataTime) / 1000);
    
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
    return `${Math.floor(ageSeconds / 3600)}h ago`;
  }, [realtimeData]);

  // Check if we have valid data - handle different data structures
  const hasData = realtimeData && (
    realtimeData.timestamp || 
    realtimeData.datetime || 
    realtimeData.reading?.timestamp || 
    realtimeData.reading?.datetime ||
    // Fallback: if we have any sensor data, consider it valid
    (realtimeData.pH !== undefined || realtimeData.temperature !== undefined || 
     realtimeData.turbidity !== undefined || realtimeData.salinity !== undefined) ||
    (realtimeData.reading?.pH !== undefined || realtimeData.reading?.temperature !== undefined || 
     realtimeData.reading?.turbidity !== undefined || realtimeData.reading?.salinity !== undefined)
  );
  const isInitialized = true; // DataContext is always initialized

  // Memoized parameters to prevent unnecessary re-renders
  const parameters = useMemo(() => {
    if (!hasData || !realtimeData) {
      return [];
    }

    // Handle different data structures - some might have nested 'reading' property
    let sensorData = realtimeData;
    if (realtimeData.reading) {
      sensorData = realtimeData.reading;
      console.log('📊 Using nested reading data from realtimeData.reading');
    } else {
      console.log('📊 Using direct realtimeData');
    }

    // Extract parameters directly from sensor data
    const { pH, temperature, turbidity, salinity } = sensorData;

    console.log('🔍 Processing sensor data:', {
      pH, temperature, turbidity, salinity,
      pHValid: pH !== null && pH !== undefined && !isNaN(pH),
      temperatureValid: temperature !== null && temperature !== undefined && !isNaN(temperature),
      turbidityValid: turbidity !== null && turbidity !== undefined && !isNaN(turbidity),
      salinityValid: salinity !== null && salinity !== undefined && !isNaN(salinity)
    });

    return [
      {
        label: "pH Level",
        value: pH !== null && pH !== undefined ? String(Number(pH)) : "--",
        unit: "PH",
        icon: <Gauge size={30} color="#007bff" />,
        color: "#007bff",
        threshold: thresholds["pH"],
        hasData: pH !== null && pH !== undefined && !isNaN(pH),
      },
      {
        label: "Temperature",
        value: temperature !== null && temperature !== undefined ? String(Number(temperature)) : "--",
        unit: "°C",
        icon: <Thermometer size={30} color="#e83e8c" />,
        color: "#e83e8c",
        threshold: thresholds["temperature"],
        hasData: temperature !== null && temperature !== undefined && !isNaN(temperature),
      },
      {
        label: "Turbidity",
        value: turbidity !== null && turbidity !== undefined ? String(Number(turbidity)) : "--",
        unit: "NTU",
        icon: <Waves size={30} color="#28a745" />,
        color: "#28a745",
        threshold: thresholds["turbidity"],
        hasData: turbidity !== null && turbidity !== undefined && !isNaN(turbidity),
      },
      {
        label: "Salinity",
        value: salinity !== null && salinity !== undefined ? String(Number(salinity)) : "--",
        unit: "PPT",
        icon: <Droplet size={30} color="#8b5cf6" />,
        color: "#8b5cf6",
        threshold: thresholds["salinity"],
        hasData: salinity !== null && salinity !== undefined && !isNaN(salinity),
      },
    ];
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
        <Text style={styles.dataAgeText}>Please check your connection and try again</Text>
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
  iconValueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8
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
    color: "rgb(36, 85, 169, 0.2)",
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
