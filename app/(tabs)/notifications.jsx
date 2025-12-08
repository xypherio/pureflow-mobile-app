import React, { useCallback } from "react";

// Components
import FeatureRatingModal from "@components/modals/FeatureRatingModal";
import IssueReportingModal from "@components/modals/IssueReportingModal";
import SettingsModal from "@components/modals/SettingsModal";
import NotificationsEmptyState from "@components/sections/NotificationsEmptyState";
import NotificationsErrorState from "@components/sections/NotificationsErrorState";
import NotificationsList from "@components/sections/NotificationsList";
import NotificationsLoadingState from "@components/sections/NotificationsLoadingState";
import PureFlowLogo from "@components/ui/UiHeader";

// Hooks
import { useNotificationsData } from "@hooks/useNotificationsData";

export default function NotificationsScreen() {
  // Modal states
  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false);
  const [isRatingVisible, setIsRatingVisible] = React.useState(false);
  const [isIssueReportingVisible, setIsIssueReportingVisible] = React.useState(false);

  const openSettingsModal = useCallback(() => {
    setIsSettingsVisible(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsVisible(false);
  }, []);

  const handleRateApp = useCallback(() => {
    setIsRatingVisible(true);
  }, []);

  const closeRatingModal = useCallback(() => {
    setIsRatingVisible(false);
  }, []);

  const handleReportIssue = useCallback(() => {
    setIsIssueReportingVisible(true);
  }, []);

  const closeIssueReportingModal = useCallback(() => {
    setIsIssueReportingVisible(false);
  }, []);

  return (
    <>
      {/* Modals */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={closeSettingsModal}
        onRateApp={handleRateApp}
        onReportIssue={handleReportIssue}
      />

      <FeatureRatingModal
        visible={isRatingVisible}
        onClose={closeRatingModal}
        onSuccess={closeRatingModal}
      />

      <IssueReportingModal
        visible={isIssueReportingVisible}
        onClose={closeIssueReportingModal}
      />

      {/* Header */}
      <PureFlowLogo onSettingsPress={openSettingsModal} />

      <NotificationsScreenComponent />
    </>
  );
}

function NotificationsScreenComponent() {
  // Use the custom notifications data hook
  const {
    // State
    activeParameter,
    activeSeverity,
    isLoading,
    error,
    limitedSections,
    showLoadMore,
    totalAlerts,
    displayedAlerts,
    isLoadingMore,
    isRefreshing,

    // Actions
    onRefresh,
    handleParameterChange,
    handleSeverityChange,
    handleScroll,
    loadMoreAlerts,

    // Utilities
    getNotificationIcon,
    getAlertLevelConfig,
    getParameterColor,
    getEnhancedMessage,
    getAlertDetails,
    handleAlertPress,
    handleDismissAlert,
  } = useNotificationsData();

  // Define filter props for reuse
  const filterProps = {
    activeParameter,
    activeSeverity,
    handleParameterChange,
    handleSeverityChange,
  };

  // Render loading state
  if (isLoading) {
    return (
      <NotificationsLoadingState {...filterProps} />
    );
  }

  // Render error state
  if (error && !limitedSections?.length) {
    return (
      <NotificationsErrorState
        error={error}
        {...filterProps}
        onRetry={() => onRefresh()}
      />
    );
  }

  // Render empty state
  if (!limitedSections?.length) {
    return (
      <NotificationsEmptyState {...filterProps} />
    );
  }

  // Render main list
  return (
    <NotificationsList
      // Data
      limitedSections={limitedSections}
      isRefreshing={isRefreshing}

      // Utilities from hook
      getNotificationIcon={getNotificationIcon}
      getAlertLevelConfig={getAlertLevelConfig}
      getParameterColor={getParameterColor}
      getEnhancedMessage={getEnhancedMessage}
      getAlertDetails={getAlertDetails}
      handleAlertPress={handleAlertPress}
      handleDismissAlert={handleDismissAlert}

      // Actions
      onRefresh={onRefresh}
      handleScroll={handleScroll}
      loadMoreAlerts={loadMoreAlerts}

      // Pagination state
      showLoadMore={showLoadMore}
      totalAlerts={totalAlerts}
      displayedAlerts={displayedAlerts}
      isLoadingMore={isLoadingMore}

      // Filters
      {...filterProps}
    />
  );
}
