import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";

const NotificationsLoadingState = ({
  activeParameter,
  activeSeverity,
  handleParameterChange,
  handleSeverityChange
}) => {
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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading alerts...</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#6b7280",
  },
});

export default NotificationsLoadingState;
