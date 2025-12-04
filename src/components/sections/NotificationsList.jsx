import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";
import NotificationCard from "@ui/NotificationCard";
import { createAlertItem, renderSectionHeader } from "@utils/notificationsUtils";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View
} from "react-native";

const NotificationsList = ({
  // Data
  limitedSections,
  isRefreshing,

  // Utilities from hook
  getNotificationIcon,
  getAlertLevelConfig,
  getParameterColor,
  getEnhancedMessage,
  getAlertDetails,
  handleAlertPress,
  handleDismissAlert,

  // Actions
  onRefresh,
  handleScroll,
  loadMoreAlerts,

  // Pagination state
  showLoadMore,
  totalAlerts,
  displayedAlerts,
  isLoadingMore,

  // Filters
  activeParameter,
  activeSeverity,
  handleParameterChange,
  handleSeverityChange
}) => {
  // Render alert item
  const renderAlertItem = ({ item }) => {
    const alertProps = createAlertItem(
      item,
      getNotificationIcon,
      (type) => getAlertLevelConfig(type, activeSeverity),
      getParameterColor,
      getEnhancedMessage,
      getAlertDetails,
      handleAlertPress,
      handleDismissAlert
    );

    return (
      <View style={styles.alertItemContainer}>
        <NotificationCard {...alertProps} />
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
        <View style={styles.filtersContainer}>
          <NotificationFilter
            selectedAlert={activeParameter}
            selectedParam={activeSeverity}
            onSelectAlert={handleParameterChange}
            onSelectParam={handleSeverityChange}
          />
        </View>

        <SectionList
          sections={limitedSections}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          renderSectionHeader={renderSectionHeader}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={() => {
            console.log("📜 onEndReached triggered", {
              totalAlerts,
              displayedAlerts,
              isLoadingMore,
              showLoadMore,
            });
            if (showLoadMore && !isLoadingMore) {
              console.log("🚀 Loading more alerts...");
              loadMoreAlerts();
            } else {
              console.log("⏹️ No more alerts to load", { showLoadMore });
            }
          }}
          onEndReachedThreshold={0.2}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
              tintColor={"#007AFF"}
            />
          }
          contentContainerStyle={styles.sectionListContent}
          showsVerticalScrollIndicator={false}
          style={styles.sectionListContainer}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingFooterContainer}>
                <ActivityIndicator size="small" color="#4a90e2" />
              </View>
            ) : null
          }
        />
      </GlobalWrapper>
    </>
  );
};

const styles = StyleSheet.create({
  alertItemContainer: {},
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
  loadingFooterContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },

});

export default NotificationsList;
