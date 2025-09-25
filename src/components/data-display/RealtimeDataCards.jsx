import { getWaterQualityThresholds } from "@constants/thresholds";
import { useData } from "@contexts/DataContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const thresholds = getWaterQualityThresholds();

export default function RealTimeData({ data = [] }) {
  const { realtimeData, refreshData } = useData();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedData, setCachedData] = useState(null);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cached data from AsyncStorage on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cached = await AsyncStorage.getItem('realtimeDataCache');
        if (cached) {
          const parsedData = JSON.parse(cached);
          setCachedData(parsedData);
          console.log('📦 Loaded cached data from AsyncStorage:', parsedData);
        }
      } catch (error) {
        console.error('❌ Error loading cached data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCachedData();
  }, []);

  // Save cached data to AsyncStorage when it changes
  const saveCachedData = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem('realtimeDataCache', JSON.stringify(data));
      console.log('💾 Saved data to AsyncStorage:', data);
    } catch (error) {
      console.error('❌ Error saving cached data:', error);
    }
  }, []);

  // Memoized latest data selection with robust fallback
  const latestData = useMemo(() => {
    // Priority 1: Use fresh real-time data if available
    if (realtimeData) {
      console.log('📊 Using real-time data:', realtimeData);
      setCachedData(realtimeData); // Cache the fresh data
      saveCachedData(realtimeData); // Persist to AsyncStorage
      setRefreshAttempts(0); // Reset failed attempts
      return realtimeData;
    }

    // Priority 2: Use cached data if available (from AsyncStorage)
    if (cachedData) {
      console.log('📊 Using cached data:', cachedData);
      return cachedData;
    }

    // Priority 3: Use latest from data array as final fallback
    if (data && data.length > 0) {
      const latest = data[data.length - 1];
      console.log('📊 Using fallback data:', latest);
      setCachedData(latest); // Cache this data too
      saveCachedData(latest); // Persist to AsyncStorage
      return latest;
    }

    // No data available - this should rarely happen
    console.log('⚠️ No data available for display');
    return null;
  }, [realtimeData, data, cachedData, saveCachedData]);

  // Optimized refresh function with retry logic
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent refreshes

    setIsRefreshing(true);
    try {
      await refreshData();
      setLastRefresh(Date.now());
      setRefreshAttempts(0); // Reset on successful refresh
      console.log('✅ Data refresh successful');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setRefreshAttempts(prev => prev + 1);

      // If we have cached data, keep showing it even after failed refresh
      if (cachedData) {
        console.log('🔄 Keeping cached data after failed refresh attempt', refreshAttempts + 1);
      }

      // Only show error after multiple failed attempts
      if (refreshAttempts >= 3) {
        console.error('🚨 Multiple refresh failures, keeping cached data');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, isRefreshing, cachedData, refreshAttempts, saveCachedData]);

  // Set up 15-second refresh interval with exponential backoff on failures
  useEffect(() => {
    let interval;

    if (refreshAttempts < 3) {
      // Normal refresh every 15 seconds
      interval = setInterval(() => {
        handleRefresh();
      }, 15000);
    } else {
      // Slow down refresh attempts after 3 failures (every 60 seconds)
      interval = setInterval(() => {
        handleRefresh();
      }, 60000);
      console.log('🐌 Slowed down refresh attempts due to repeated failures');
    }

    // Initial refresh
    handleRefresh();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [handleRefresh, refreshAttempts]);

  // Memoized parameters to prevent unnecessary re-renders
  const parameters = useMemo(() => {
    if (!latestData) {
      return [];
    }

    return [
      {
        label: "pH Level",
        value: latestData.pH !== undefined ? String(latestData.pH) : "0",
        unit: "pH",
        icon: <Gauge size={30} color="#007bff" />,
        color: "#007bff",
        threshold: thresholds["pH"],
      },
      {
        label: "Temperature",
        value: latestData.temperature !== undefined ? String(latestData.temperature) : "0",
        unit: "°C",
        icon: <Thermometer size={30} color="#e83e8c" />,
        color: "#e83e8c",
        threshold: thresholds["temperature"],
      },
      {
        label: "Turbidity",
        value: latestData.turbidity !== undefined ? String(latestData.turbidity) : "0",
        unit: "NTU",
        icon: <Waves size={30} color="#28a745" />,
        color: "#28a745",
        threshold: thresholds["turbidity"],
      },
      {
        label: "Salinity",
        value: latestData.salinity !== undefined ? String(latestData.salinity) : "0",
        unit: "ppt",
        icon: <Droplet size={30} color="#8b5cf6" />,
        color: "#8b5cf6",
        threshold: thresholds["salinity"],
      },
    ];
  }, [latestData]);

  // Show loading state only if no cached data and not yet initialized
  if (!isInitialized || (!latestData && refreshAttempts === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sensor data...</Text>
          <Text style={styles.lastRefreshText}>
            Last refresh: {new Date(lastRefresh).toLocaleTimeString()}
          </Text>
        </View>
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
          style={[styles.valueText, {
            color: param.color,
          }]}
        >
          {param.value}
        </Text>
        <Text
          style={[styles.unitText, {
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
  unitText: {
    fontSize: 20,
    fontWeight: "bold",
    paddingBottom: 10,
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