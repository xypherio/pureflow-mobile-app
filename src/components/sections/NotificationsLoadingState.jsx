import React from "react";
import { StyleSheet, View } from "react-native";
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";
import { AlertsSkeleton } from "@ui/LoadingSkeletons";

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

        <View style={styles.skeletonListContainer}>
          {Array.from({ length: 6 }).map((_, index) => (
            <AlertsSkeleton key={index} />
          ))}
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
