/** NotificationsErrorState - Error state display for notification loading failures with retry options */
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";
import React from "react";
import { AlertTriangle, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NotificationsErrorState = ({
  error,
  activeParameter,
  activeSeverity,
  handleParameterChange,
  handleSeverityChange,
  onRetry
}) => {
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

        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#ef4444" style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Failed to Load Alerts</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
});

export default NotificationsErrorState;
