import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import NotificationCard from "@ui/NotificationCard";
import PureFlowLogo from "@components/ui/UiHeader";
import NotificationFilter from "@navigation/AlertsFilter";
import GlobalWrapper from "@ui/GlobalWrapper";
import { renderSectionHeader, createAlertItem } from "@utils/notificationsUtils";

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
      getAlertLevelConfig,
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

  // Render Load More button
  const renderLoadMoreButton = () => {
    if (!showLoadMore) return null;

    return (
      <View style={styles.loadMoreContainer}>
        <TouchableOpacity
          onPress={loadMoreAlerts}
          disabled={isLoadingMore}
          style={[
            styles.loadMoreButton,
            isLoadingMore && styles.loadMoreButtonDisabled,
          ]}
        >
          {isLoadingMore ? (
            <View style={styles.loadMoreButtonContent}>
              <ActivityIndicator
                size="small"
                color="white"
                style={styles.activityIndicator}
              />
              <Text style={styles.loadMoreButtonText}>Loading more alerts...</Text>
            </View>
          ) : (
            <View style={styles.loadMoreButtonContent}>
              <Text style={styles.loadMoreButtonText}>Load More Alerts</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
              tintColor={"#007AFF"}
            />
          }
          contentContainerStyle={[
            styles.sectionListContent,
            {
              paddingBottom: showLoadMore ? 100 : 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.sectionListContainer}
        />
        {renderLoadMoreButton()}
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
  loadMoreContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  loadMoreButton: {
    backgroundColor: "#2455a9",
    marginVertical: 5,
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

export default NotificationsList;
