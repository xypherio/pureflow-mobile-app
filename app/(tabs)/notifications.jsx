import NotificationFilter from "@navigation/AlertsFilter";
import { useNavigation } from "@react-navigation/native";
import { historicalAlertsService } from "@services/historicalAlertsService";
import GlobalWrapper from "@ui/GlobalWrapper";
import NotificationCard from "@ui/NotificationCard";
import PureFlowLogo from "@ui/UiHeader";
import { AlertTriangle, Bell, CheckCircle, Info } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { colors } from "../../src/constants/colors";

// Alert type mappings for display
const getAlertIcon = (type) => {
  switch (type) {
    case "error":
      return <AlertTriangle size={20} color="#ef4444" />;
    case "warning":
      return <AlertTriangle size={20} color="#eab308" />;
    case "info":
      return <Info size={20} color="#2563eb" />;
    case "success":
      return <CheckCircle size={20} color="#22c55e" />;
    default:
      return <Bell size={20} color="#6b7280" />;
  }
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#eab308";
    case "low":
      return "#22c55e";
    default:
      return "#6b7280";
  }
};

const alertLevelMap = {
  success: { icon: "check-circle", iconColor: "#22c55e", bg: "#e6f9ed" },
  warning: { icon: "alert-triangle", iconColor: "#eab308", bg: "#fef9c3" },
  error: { icon: "x-circle", iconColor: "#ef4444", bg: "#fee2e2" },
  info: { icon: "info", iconColor: "#2563eb", bg: "#dbeafe" },
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [activeParameter, setActiveParameter] = useState("all"); // Water parameter filter
  const [activeSeverity, setActiveSeverity] = useState("all"); // Severity/alert type filter
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20); // Initial limit for displayed alerts
  const [loadingMore, setLoadingMore] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Fetch historical alerts from Firebase
  const fetchHistoricalAlerts = useCallback(
    async (showRefreshIndicator = false, additionalLimit = 0) => {
      try {
        if (showRefreshIndicator) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const baseLimit = 30; // Initial limit of 30 records
        const totalLimit = baseLimit + additionalLimit;

        console.log(`🔄 Fetching historical alerts (limit: ${totalLimit})...`);
        const alertsData = await historicalAlertsService.getHistoricalAlerts({
          useCache: !showRefreshIndicator,
          limitCount: totalLimit, // Use the total limit (30 + additional)
          filterType: activeSeverity !== "all" ? activeSeverity : null, // Severity filter (error, warning, info, normal)
          filterParameter: activeParameter !== "all" ? activeParameter : null, // Parameter filter (pH, temperature, etc.)
        });

        // Check if we got fewer alerts than requested (means we've reached the end)
        const requestedAdditionalLimit = additionalLimit;
        const initialLimit = 30;
        const expectedBatchSize = requestedAdditionalLimit > 0 ? 30 : initialLimit; // Always fetch 30 alerts per batch

        const actuallyReceived = alertsData.totalCount - (historicalData?.totalCount || 0);
        const hasMoreDataInDatabase = requestedAdditionalLimit === 0 ||
          actuallyReceived >= expectedBatchSize ||
          alertsData.totalCount >= 50; // Assume we have more if we have 50+ total

        console.log(`🔍 Load More Check: Requested ${expectedBatchSize}, received ${actuallyReceived}, hasMore=${hasMoreDataInDatabase}`);

        setHistoricalData({
          ...alertsData,
          hasMoreDataInDatabase, // Add flag to indicate if there are more alerts available
        });
        console.log(
          `✅ Loaded ${alertsData.totalCount} historical alerts in ${alertsData.sections.length} sections`
        );
      } catch (err) {
        console.error("❌ Error fetching historical alerts:", err);
        setError(err.message || "Failed to load alerts");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeParameter, activeSeverity]
  );

  // Load more alerts function - fetches another 30 alerts from Firebase
  const loadMoreAlerts = useCallback(async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    try {
      // Always fetch the next batch of 30 alerts
      const currentBatchNumber = Math.max(1, Math.ceil((historicalData?.totalCount || 30) / 30));
      const newAdditionalLimit = currentBatchNumber * 30;

      console.log(`📈 Loading more alerts from Firebase: +30 records (batch ${currentBatchNumber + 1}, total limit: ${30 + newAdditionalLimit})`);
      await fetchHistoricalAlerts(false, newAdditionalLimit);

      // Also increase displayed limit
      setDisplayLimit((prev) => prev + 20);
    } catch (err) {
      console.error("❌ Error loading more alerts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, displayLimit, historicalData, fetchHistoricalAlerts]);

  // Get limited sections for display
  const getLimitedSections = useCallback(
    (sections) => {
      if (!sections || sections.length === 0) return [];

      let totalDisplayed = 0;
      const limitedSections = [];

      for (const section of sections) {
        if (totalDisplayed >= displayLimit) break;

        const remainingLimit = displayLimit - totalDisplayed;
        const limitedData = section.data.slice(0, remainingLimit);

        if (limitedData.length > 0) {
          limitedSections.push({
            ...section,
            data: limitedData,
          });
          totalDisplayed += limitedData.length;
        }
      }

      return limitedSections;
    },
    [displayLimit]
  );

  // Check if there are more alerts to load
  const hasMoreAlerts = useCallback(() => {
    if (!historicalData?.sections) return false;

    const totalAlerts = historicalData.sections.reduce(
      (sum, section) => sum + section.data.length,
      0
    );

    // Only show Load More if we have more alerts than displayed AND more data exists in Firebase
    const hasUndisplayedAlerts = totalAlerts > displayLimit;
    const hasMoreDataInDatabase = historicalData.hasMoreDataInDatabase !== false; // Default to true if undefined

    return hasUndisplayedAlerts && hasMoreDataInDatabase;
  }, [historicalData, displayLimit]);

  // Initial load
  useEffect(() => {
    fetchHistoricalAlerts();
  }, [fetchHistoricalAlerts]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    // Clear cache and fetch fresh data
    historicalAlertsService.clearCache();
    fetchHistoricalAlerts(true);
  }, [fetchHistoricalAlerts]);

  // Handle parameter filter changes (upper row)
  const handleParameterChange = useCallback(
    (newParameter) => {
      console.log(`🔍 Parameter filter changed to: ${newParameter}`);
      setActiveParameter(newParameter);
      setDisplayLimit(20); // Reset display limit when filter changes
      setIsNearBottom(false);
      // Trigger fresh data fetch with new filter
      fetchHistoricalAlerts(false);
    },
    [fetchHistoricalAlerts]
  );

  // Handle severity filter changes (lower row)
  const handleSeverityChange = useCallback(
    (newSeverity) => {
      console.log(`🔍 Severity filter changed to: ${newSeverity}`);
      setActiveSeverity(newSeverity);
      setDisplayLimit(20); // Reset display limit when filter changes
      setIsNearBottom(false);
      // Trigger fresh data fetch with new filter
      fetchHistoricalAlerts(false);
    },
    [fetchHistoricalAlerts]
  );

  // Handle scroll detection
  const handleScroll = useCallback((event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // Trigger when 100px from bottom
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    setIsNearBottom(isCloseToBottom);
  }, []);

  // Map alert type to NotificationCard icon
  const getNotificationIcon = (type) => {
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
  };

  // Get alert level configuration for NotificationCard
  const getAlertLevelConfig = (type) => {
    const configs = {
      success: { bg: "#e6f9ed", iconColor: "#22c55e" },
      warning: { bg: "#fef9c3", iconColor: "#eab308" },
      error: { bg: "#fee2e2", iconColor: "#ef4444" },
      info: { bg: "#dbeafe", iconColor: "#2563eb" },
    };
    return configs[type] || configs.info;
  };

  const getParameterColor = (parameter) => {
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
  };

  // Render alert item using NotificationCard
  const renderAlertItem = ({ item }) => {
    const alertLevel = getAlertLevelConfig(item.type);
    const icon = getNotificationIcon(item.type);

    // Enhanced message with metadata
    const enhancedMessage = `${item.message}\n\n${item.dataAge}${
      item.occurrenceCount > 1 ? ` • ${item.occurrenceCount} occurrences` : ""
    }`;

    return (
      <View style={styles.alertItemContainer}>
        <NotificationCard
          type="suggestion"
          title={item.title}
          message={enhancedMessage}
          parameter={item.parameter}
          icon={icon}
          alertLevel={alertLevel}
          bg={alertLevel.bg}
          iconColor={alertLevel.iconColor}
          dotColor={getParameterColor(item.parameter)}
          onPrimaryAction={() => navigation.navigate("forecast")}
          onSecondaryAction={() => console.log("Dismissed alert:", item.id)}
        />
      </View>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const allSections = historicalData?.sections || [];
  const limitedSections = getLimitedSections(allSections);
  const hasAlerts = limitedSections.length > 0;
  const showLoadMore = hasMoreAlerts();
  const totalAlerts = allSections.reduce(
    (sum, section) => sum + section.data.length,
    0
  );
  const displayedAlerts = limitedSections.reduce(
    (sum, section) => sum + section.data.length,
    0
  );

  // Render Load More button (shown whenever there are more alerts to load)
  const renderLoadMoreButton = () => {
    if (!showLoadMore) return null;

    return (
      <View style={styles.loadMoreContainer}>
        <TouchableOpacity
          onPress={loadMoreAlerts}
          disabled={loadingMore}
          style={[
            styles.loadMoreButton,
            loadingMore && styles.loadMoreButtonDisabled,
          ]}
        >
          {loadingMore ? (
            <View style={styles.loadMoreButtonContent}>
              <ActivityIndicator
                size="small"
                color="white"
                style={styles.activityIndicator}
              />
              <Text style={styles.loadMoreButtonText}>
                Loading more alerts...
              </Text>
            </View>
          ) : (
            <View style={styles.loadMoreButtonContent}>
              <Text style={styles.loadMoreButtonText}>
                Load More Alerts
              </Text>
              <Text style={styles.loadMoreButtonSubtext}>
                ({totalAlerts - displayedAlerts} remaining)
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <PureFlowLogo
        weather={{
          label: "Light Rain",
          temp: "30°C",
          icon: "partly",
        }}
      />

      <GlobalWrapper disableScrollView>
        {/* Filters - Always visible even during loading */}
        <View style={styles.filtersContainer}>
          <NotificationFilter
            selectedAlert={activeParameter}
            selectedParam={activeSeverity}
            onSelectAlert={handleParameterChange}
            onSelectParam={handleSeverityChange}
          />
        </View>

        {/* Loading State */}
        {loading && !historicalData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading alerts...</Text>
          </View>
        ) : (
            /* Error State */
            error && !historicalData ? (
              <View style={styles.errorContainer}>
                <AlertTriangle size={48} color="#ef4444" style={styles.errorIcon} />
                <Text style={styles.errorTitle}>
                  Failed to Load Alerts
                </Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity
                  onPress={() => fetchHistoricalAlerts()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Alerts List - Only show when not in loading or error states */
              <>
                {hasAlerts ? (
                  <>
                    <SectionList
                      sections={limitedSections}
                      keyExtractor={(item) => item.id}
                      renderItem={renderAlertItem}
                      renderSectionHeader={renderSectionHeader}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      refreshControl={
                        <RefreshControl
                          refreshing={refreshing}
                          onRefresh={onRefresh}
                          colors={["#007AFF"]}
                          tintColor={"#007AFF"}
                        />
                      }
                      contentContainerStyle={[
                        styles.sectionListContent,
                        {
                          paddingBottom: showLoadMore ? 120 : 24, // Extra space for button
                        },
                      ]}
                      showsVerticalScrollIndicator={false}
                      style={styles.sectionListContainer}
                    />
                    {renderLoadMoreButton()}
                  </>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Bell size={48} color="#9ca3af" style={styles.emptyStateIcon} />
                    <Text style={styles.emptyStateTitle}>
                      No Alerts Found
                    </Text>
                    <Text style={styles.emptyStateMessage}>
                      {activeParameter !== "all" || activeSeverity !== "all"
                        ? "Try adjusting your filters to see more alerts."
                        : "No historical alerts available at the moment."}
                    </Text>
                  </View>
                )}
              </>
            )
          )}
      </GlobalWrapper>
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  alertItemContainer: {
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingBottom: 4,
    paddingTop: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#1a2d51",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "500",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4b5563",
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  loadMoreContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  loadMoreButton: {
    backgroundColor: "#2455a9",
    marginVertical: 10,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreButtonText: {
    color: "#f0f8fe",
    fontWeight: "700",
  },
  loadMoreButtonSubtext: {
    color: "#f0f8fe",
    fontWeight: "500",
    marginLeft: 8,
  },
  loadMoreButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIndicator: {
    marginRight: 8,
  },
  filtersContainer: {
    marginTop: 65,
    marginHorizontal: 0,
  },
  sectionListContainer: {
    flex: 1,
  },
  sectionListContent: {
    flexGrow: 1,
  },
});
