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

  // Helper function to map UI severity filter to data severity
  const mapUISeverityToDataSeverity = useCallback((uiSeverity) => {
    switch (uiSeverity) {
      case 'critical':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      case 'normal':
        return 'normal';
      default:
        return uiSeverity;
    }
  }, []);

  // Memoized computed values
  const isLoading = loading && !historicalData;
  const isRefreshing = refreshing;
  const isLoadingMore = loadingMore;

  // Load initial batch of alerts
  const loadInitialBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, check if we have prefetched alerts available
      const prefetchedAlerts = historicalAlertsService.getPrefetchedAlerts();
      let alertsData;
      let usePrefetched = false;

      if (prefetchedAlerts && prefetchedAlerts.length > 0) {
        console.log('🎯 Using prefetched alerts for initial load');
        // Use prefetched alerts directly
        alertsData = {
          alerts: prefetchedAlerts,
          lastDocumentId: prefetchedAlerts.length > 0 ? prefetchedAlerts[prefetchedAlerts.length - 1].id : null,
          hasMore: true // Assume there are more since we only prefetched 50
        };
        usePrefetched = true;
      } else {
        console.log('🌐 Prefetched alerts not available, fetching fresh data');
        // Fall back to fetching fresh data
        const result = await historicalAlertsService.fetchPaginatedAlerts({
          batchSize: 50 // Use same batch size for consistency
        });
        alertsData = result;
        usePrefetched = false;
      }

      const newAlerts = [];
      const newSignatures = new Set();

      for (const alert of alertsData.alerts) {
        const signature = `${alert.parameter}-${alert.type}-${alert.title}-${Math.round((alert.value || 0) * 100) / 100}`;
        if (!newSignatures.has(signature)) {
          newSignatures.add(signature);
          newAlerts.push(alert);
        }
      }

      setAccumulatedAlerts(newAlerts);
      setSeenSignatures(newSignatures);
      setLastDocId(alertsData.lastDocumentId);
      setHasMoreData(alertsData.hasMore);

      // Process and set historicalData
      const filterSeverity = activeSeverity !== "all" ? mapUISeverityToDataSeverity(activeSeverity) : null;
      const filterParameter = activeParameter !== "all" ? activeParameter : null;
      const processedData = historicalAlertsService.processAndSectionAlerts(newAlerts, null, filterSeverity, filterParameter);
      setHistoricalData({
        ...processedData,
        hasMoreDataInDatabase: alertsData.hasMore,
        fromPrefetch: usePrefetched
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
        batchSize: 50 // Match batch size with initial load
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
        const filterSeverity = activeSeverity !== "all" ? mapUISeverityToDataSeverity(activeSeverity) : null;
        const filterParameter = activeParameter !== "all" ? activeParameter : null;
        const processedData = historicalAlertsService.processAndSectionAlerts(updatedAlerts, null, filterSeverity, filterParameter);
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

  // Handle parameter filter changes - filter locally instead of refetching
  const handleParameterChange = useCallback(
    (newParameter) => {
      setActiveParameter(newParameter);
      setDisplayLimit(20);
      setIsNearBottom(false);

      // Reprocess existing accumulated alerts with new filter
      const filterSeverity = activeSeverity !== "all" ? mapUISeverityToDataSeverity(activeSeverity) : null;
      const filterParameter = newParameter !== "all" ? newParameter : null;
      const processedData = historicalAlertsService.processAndSectionAlerts(accumulatedAlerts, null, filterSeverity, filterParameter);
      setHistoricalData({
        ...processedData,
        hasMoreDataInDatabase: hasMoreData,
      });
    },
    [activeSeverity, accumulatedAlerts, hasMoreData, mapUISeverityToDataSeverity]
  );

  // Handle severity filter changes - filter locally instead of refetching
  const handleSeverityChange = useCallback(
    (newSeverity) => {
      setActiveSeverity(newSeverity);
      setDisplayLimit(20);
      setIsNearBottom(false);

      // Special logic for info filter - includes both low and info severity alerts
      let filteredAlerts = accumulatedAlerts;
      if (newSeverity === 'info') {
        // Info filter includes alerts with severity 'low' or 'info'
        filteredAlerts = accumulatedAlerts.filter(alert =>
          alert.severity && (alert.severity.toLowerCase() === 'low' || alert.severity.toLowerCase() === 'info')
        );
      }

      // Reprocess existing accumulated alerts with new filter
      const filterSeverity = newSeverity === 'info' ? null : (newSeverity !== "all" ? mapUISeverityToDataSeverity(newSeverity) : null);
      const filterParameter = activeParameter !== "all" ? activeParameter : null;

      // For info filter, use our pre-filtered alerts; for others use normal service filtering
      const processedData = historicalAlertsService.processAndSectionAlerts(
        newSeverity === 'info' ? filteredAlerts : accumulatedAlerts,
        null,
        filterSeverity,
        filterParameter
      );
      setHistoricalData({
        ...processedData,
        hasMoreDataInDatabase: hasMoreData,
      });
    },
    [activeParameter, accumulatedAlerts, hasMoreData, mapUISeverityToDataSeverity]
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
  const getAlertLevelConfig = useCallback((type, activeSeverity = null) => {
    // If info filter is active, use light blue for all notifications
    if (activeSeverity === 'info') {
      return {
        bg: "#e0f4fa",
        iconColor: "#87ceeb"  // Light blue color
      };
    }

    // Default configurations for other filters
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
