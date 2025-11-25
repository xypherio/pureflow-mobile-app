import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { historicalAlertsService } from "@services/historicalAlertsService";
import { colors } from "@constants/colors";

export const useNotificationsData = () => {
  // State management
  const [activeParameter, setActiveParameter] = useState("all");
  const [activeSeverity, setActiveSeverity] = useState("all");
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Pagination state
  const [accumulatedAlerts, setAccumulatedAlerts] = useState([]);
  const [seenSignatures, setSeenSignatures] = useState(new Set());
  const [lastDocId, setLastDocId] = useState(null);
  const [hasMoreData, setHasMoreData] = useState(true);

  const navigation = useNavigation();

  // Memoized computed values
  const isLoading = loading && !historicalData;
  const isRefreshing = refreshing;
  const isLoadingMore = loadingMore;

  // Load initial batch of alerts
  const loadInitialBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await historicalAlertsService.fetchPaginatedAlerts({
        batchSize: 30
      });

      const newAlerts = [];
      const newSignatures = new Set();

      for (const alert of result.alerts) {
        const signature = `${alert.parameter}-${alert.type}-${alert.title}-${Math.round((alert.value || 0) * 100) / 100}`;
        if (!newSignatures.has(signature)) {
          newSignatures.add(signature);
          newAlerts.push(alert);
        }
      }

      setAccumulatedAlerts(newAlerts);
      setSeenSignatures(newSignatures);
      setLastDocId(result.lastDocumentId);
      setHasMoreData(result.hasMore);

      // Process and set historicalData
      const processedData = historicalAlertsService.processAndSectionAlerts(newAlerts, activeSeverity !== "all" ? activeSeverity : null, activeParameter !== "all" ? activeParameter : null);
      setHistoricalData({
        ...processedData,
        hasMoreDataInDatabase: result.hasMore,
      });
    } catch (err) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [activeSeverity, activeParameter]);

  // Load more alerts function
  const loadMoreAlerts = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);
    try {
      const result = await historicalAlertsService.fetchPaginatedAlerts({
        startAfterDocumentId: lastDocId,
        batchSize: 30
      });

      const newAlerts = [];
      const newSignatures = new Set(seenSignatures);

      for (const alert of result.alerts) {
        const signature = `${alert.parameter}-${alert.type}-${alert.title}-${Math.round((alert.value || 0) * 100) / 100}`;
        if (!newSignatures.has(signature)) {
          newSignatures.add(signature);
          newAlerts.push(alert);
        }
      }

      if (newAlerts.length > 0) {
        const updatedAlerts = [...accumulatedAlerts, ...newAlerts];
        setAccumulatedAlerts(updatedAlerts);
        setSeenSignatures(newSignatures);
        setLastDocId(result.lastDocumentId);
        setHasMoreData(result.hasMore);

        // Process and update historicalData
        const processedData = historicalAlertsService.processAndSectionAlerts(updatedAlerts, activeSeverity !== "all" ? activeSeverity : null, activeParameter !== "all" ? activeParameter : null);
        setHistoricalData({
          ...processedData,
          hasMoreDataInDatabase: result.hasMore,
        });

        // Increase display limit
        setDisplayLimit((prev) => prev + 20);
      } else {
        setHasMoreData(false);
      }
    } catch (err) {
      console.error("❌ Error loading more alerts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreData, lastDocId, seenSignatures, accumulatedAlerts, activeSeverity, activeParameter]);

  // Get limited sections for display
  const limitedSections = useMemo(() => {
    if (!historicalData?.sections) return [];

    let totalDisplayed = 0;
    const sections = [];

    for (const section of historicalData.sections) {
      if (totalDisplayed >= displayLimit) break;

      const remainingLimit = displayLimit - totalDisplayed;
      const limitedData = section.data.slice(0, remainingLimit);

      if (limitedData.length > 0) {
        sections.push({
          ...section,
          data: limitedData,
        });
        totalDisplayed += limitedData.length;
      }
    }

    return sections;
  }, [historicalData, displayLimit]);

  // Check if there are more alerts to load
  const hasMoreAlerts = useMemo(() => {
    if (!historicalData?.sections) return false;

    const totalAlerts = historicalData.sections.reduce(
      (sum, section) => sum + section.data.length,
      0
    );

    // Only show Load More if we have more alerts than displayed AND more data exists in Firebase
    const hasUndisplayedAlerts = totalAlerts > displayLimit;
    const hasMoreDataInDatabase =
      historicalData.hasMoreDataInDatabase !== false;

    return hasUndisplayedAlerts && hasMoreDataInDatabase;
  }, [historicalData, displayLimit]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    // Reset pagination state
    setAccumulatedAlerts([]);
    setSeenSignatures(new Set());
    setLastDocId(null);
    setHasMoreData(true);
    setDisplayLimit(20);

    // Reload initial batch
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Handle parameter filter changes
  const handleParameterChange = useCallback(
    (newParameter) => {
      setActiveParameter(newParameter);
      // Reset pagination state for new filter
      setAccumulatedAlerts([]);
      setSeenSignatures(new Set());
      setLastDocId(null);
      setHasMoreData(true);
      setDisplayLimit(20);
      setIsNearBottom(false);
      // Reload with new filter
      loadInitialBatch();
    },
    [loadInitialBatch]
  );

  // Handle severity filter changes
  const handleSeverityChange = useCallback(
    (newSeverity) => {
      setActiveSeverity(newSeverity);
      // Reset pagination state for new filter
      setAccumulatedAlerts([]);
      setSeenSignatures(new Set());
      setLastDocId(null);
      setHasMoreData(true);
      setDisplayLimit(20);
      setIsNearBottom(false);
      // Reload with new filter
      loadInitialBatch();
    },
    [loadInitialBatch]
  );

  // Handle scroll detection
  const handleScroll = useCallback((event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 16;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    setIsNearBottom(isCloseToBottom);
  }, []);

  // Get notification icon for NotificationCard
  const getNotificationIcon = useCallback((type) => {
    switch (type) {
      case "error":
        return "x-circle";
      case "warning":
        return "alert-triangle";
      case "success":
        return "check-circle";
      case "info":
      default:
        return "info";
    }
  }, []);

  // Get alert level configuration for NotificationCard
  const getAlertLevelConfig = useCallback((type) => {
    const configs = {
      success: { bg: "#e6f9ed", iconColor: "#22c55e" },
      warning: { bg: "#fef9c3", iconColor: "#eab308" },
      error: { bg: "#fee2e2", iconColor: "#ef4444" },
      info: { bg: "#dbeafe", iconColor: "#2563eb" },
    };
    return configs[type] || configs.info;
  }, []);

  const getParameterColor = useCallback((parameter) => {
    switch (parameter) {
      case "pH":
        return colors.phColor;
      case "temperature":
        return colors.tempColor;
      case "turbidity":
        return colors.turbidityColor;
      case "salinity":
        return colors.salinityColor;
      default:
        return colors.primary;
    }
  }, []);

  // Enhanced message with metadata for NotificationCard
  const getEnhancedMessage = useCallback((item) => {
    return `${item.message}\n\n${item.dataAge}${
      item.occurrenceCount > 1 ? ` • ${item.occurrenceCount} occurrences` : ""
    }`;
  }, []);

  // Get mock alert details for NotificationCard
  const getAlertDetails = useCallback(() => {
    return {
      confidence: 0.9,
      impact: "high",
      recommendations: [
        "Check cooling/heating systems",
        "Reduce system load"
      ],
      metadata: {
        sensorId: "TEMP_001",
        location: "Main Tank",
        threshold: "30°C"
      },
      source: "sensor"
    };
  }, []);

  // Handle alert item press
  const handleAlertPress = useCallback(() => {
    navigation.navigate("forecast");
  }, [navigation]);

  // Handle dismiss alert
  const handleDismissAlert = useCallback(() => {
    console.log("Dismissed alert");
  }, []);

  // Initial load
  useEffect(() => {
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Computed values for UI
  const showLoadMore = hasMoreAlerts && isNearBottom;
  const totalAlerts = historicalData?.sections?.reduce(
    (sum, section) => sum + section.data.length,
    0
  ) || 0;
  const displayedAlerts = limitedSections?.reduce(
    (sum, section) => sum + section.data.length,
    0
  ) || 0;

  return {
    // State
    activeParameter,
    activeSeverity,
    historicalData,
    isLoading,
    isRefreshing,
    error,
    limitedSections,
    showLoadMore,
    totalAlerts,
    displayedAlerts,
    isLoadingMore,

    // Actions
    onRefresh,
    handleParameterChange,
    handleSeverityChange,
    handleScroll,
    loadMoreAlerts,
    getNotificationIcon,
    getAlertLevelConfig,
    getParameterColor,
    getEnhancedMessage,
    getAlertDetails,
    handleAlertPress,
    handleDismissAlert,
  };
};
