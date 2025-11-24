import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";

const NotificationsEmptyState = ({
  activeParameter,
  activeSeverity,
  handleParameterChange,
  handleSeverityChange
}) => {
  const hasActiveFilters = activeParameter !== "all" || activeSeverity !== "all";

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
});

export default NotificationsEmptyState;
