import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Bell, Settings } from "lucide-react-native";
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";

const NotificationsEmptyState = ({
  activeParameter,
  activeSeverity,
  handleParameterChange,
  handleSeverityChange,
  onDebugModeToggle
}) => {
  const hasActiveFilters = activeParameter !== "all" || activeSeverity !== "all";

  return (
    <>
      <GlobalWrapper disableScrollView>
        <View style={styles.filtersContainer}>
          <NotificationFilter
            selectedAlert={activeParameter}
            selectedParam={activeSeverity}
            onSelectAlert={handleParameterChange}
            onSelectParam={handleSeverityChange}
          />
        </View>

        <View style={styles.emptyStateContainer}>
          <Bell size={48} color="#9ca3af" style={styles.emptyStateIcon} />
          <Text style={styles.emptyStateTitle}>No Alerts Found</Text>
          <Text style={styles.emptyStateMessage}>
            {hasActiveFilters
              ? "Try adjusting your filters to see more alerts."
              : "No historical alerts available at the moment."}
          </Text>

          {onDebugModeToggle && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={onDebugModeToggle}
            >
              <Settings size={16} color="#2455a9" />
              <Text style={styles.debugButtonText}>Debug Notifications</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlobalWrapper>
    </>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    marginTop: 65,
    marginHorizontal: 0,
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
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  debugButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#2455a9",
    fontWeight: "600",
  },
});

export default NotificationsEmptyState;
