import React from "react";
import GlobalWrapper from "@ui/GlobalWrapper";

// Components
import NotificationsLoadingState from "@components/sections/NotificationsLoadingState";
import NotificationsErrorState from "@components/sections/NotificationsErrorState";
import NotificationsEmptyState from "@components/sections/NotificationsEmptyState";
import NotificationsList from "@components/sections/NotificationsList";

// Hooks
import { useNotificationsData } from "@hooks/useNotificationsData";

export default function NotificationsScreen() {
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

  // Render loading state
  if (isLoading) {
    return (
      <NotificationsLoadingState
        activeParameter={activeParameter}
        activeSeverity={activeSeverity}
        handleParameterChange={handleParameterChange}
        handleSeverityChange={handleSeverityChange}
      />
    );
  }

  // Render error state
  if (error && !limitedSections?.length) {
    return (
      <NotificationsErrorState
        error={error}
        activeParameter={activeParameter}
        activeSeverity={activeSeverity}
        handleParameterChange={handleParameterChange}
        handleSeverityChange={handleSeverityChange}
        onRetry={() => onRefresh()}
      />
    );
  }

  // Render empty state
  if (!limitedSections?.length) {
    return (
      <NotificationsEmptyState
        activeParameter={activeParameter}
        activeSeverity={activeSeverity}
        handleParameterChange={handleParameterChange}
        handleSeverityChange={handleSeverityChange}
      />
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
      activeParameter={activeParameter}
      activeSeverity={activeSeverity}
      handleParameterChange={handleParameterChange}
      handleSeverityChange={handleSeverityChange}
    />
  );
}
