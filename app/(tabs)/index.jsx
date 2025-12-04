import { useData } from "@contexts/DataContext";
import { useDeviceStatus } from "@hooks/useDeviceStatus";
import { useNotifications } from "@hooks/useNotifications";
import { useNotificationSetup } from "@hooks/useNotificationSetup";
import { useWaterQualityNotifications } from "@hooks/useWaterQualityNotifications";
import { useWeather } from "@contexts/WeatherContext";
import React, { Suspense, useCallback, useMemo, useState } from "react";

import SystemStatusSection from "@components/sections/SystemStatusSection";
import { globalStyles } from "@styles/globalStyles";
import ErrorBoundary from "@ui/ErrorBoundary";
import GlobalWrapper from "@ui/GlobalWrapper";
import {
  DashboardSkeleton,
  InsightsSkeleton,
  SystemStatusSkeleton,
} from "@ui/LoadingSkeletons";
import RefreshControlWrapper from "@ui/RefreshControlWrapper";
import PureFlowLogo from "@ui/UiHeader";
import SettingsModal from "@components/modals/SettingsModal";
import IssueReportingModal from "@components/modals/IssueReportingModal";
import FeatureRatingModal from "@components/modals/FeatureRatingModal";
import { getWeatherInfo } from "@utils/sensorDataUtils";
import { ScrollView } from "react-native";

// Lazy-loaded heavy components for better performance
const LazyInsightsSection = React.lazy(() =>
  import("@components/sections/InsightsSection").then(module => ({
    default: module.default
  }))
);

const LazyDashboardSection = React.lazy(() =>
  import("@components/sections/DashboardSection").then(module => ({
    default: module.default
  }))
);

export default function HomeScreen() {
  // Data and loading states
  const {
    alerts,
    sensorData,
    loading,
    refreshData,
    lastUpdate,
    realtimeData,
  } = useData();

  // Device status computed from realtime data (already memoized in hook)
  const { isDatmActive, isSolarPowered } = useDeviceStatus(realtimeData);

  // Notifications setup
  const {
    isInitialized,
    unreadCount,
    addNotificationListener,
  } = useNotifications();

  useWaterQualityNotifications();
  useNotificationSetup(isInitialized, addNotificationListener);

  // Get weather context for humidity data
  const { currentWeather } = useWeather();

  // Get humidity from weather data
  const humidity = useMemo(() =>
    currentWeather?.humidity || null,
    [currentWeather?.humidity]
  );



  // Memoized weather info computation for performance
  const weatherInfo = useMemo(() =>
    getWeatherInfo(realtimeData?.isRaining || 0),
    [realtimeData?.isRaining]
  );

  // Note: Using simple lazy loading instead of viewport-based loading
  // for better React Native compatibility

  // Modal states
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [isIssueReportingVisible, setIsIssueReportingVisible] = useState(false);

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

  // Memoized refresh handler to prevent recreation and useInsertionEffect warnings
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, [refreshData]);

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
      <PureFlowLogo
        notificationBadge={unreadCount > 0 ? unreadCount : null}
        onSettingsPress={openSettingsModal}
      />

      <GlobalWrapper style={globalStyles.pageBackground}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControlWrapper
              refreshing={loading}
              onRefresh={handleRefresh}
            />
          }
        >
          {/* System Status Section */}
          <ErrorBoundary fallbackMessage="System status temporarily unavailable">
            {loading ? (
              <SystemStatusSkeleton />
            ) : (
              <SystemStatusSection
                isDatmActive={isDatmActive}
                isSolarPowered={isSolarPowered}
                isRaining={realtimeData?.isRaining || 0}
                humidity={humidity}
              />
            )}
          </ErrorBoundary>

          {/* Dashboard Sections - Lazy loaded for better performance */}
          <ErrorBoundary fallbackMessage="Dashboard data temporarily unavailable">
            <Suspense fallback={<DashboardSkeleton />}>
              <LazyDashboardSection
                alerts={alerts}
                realtimeData={realtimeData}
                sensorData={sensorData}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Insights Section - Lazy loaded for better performance */}
          <ErrorBoundary fallbackMessage="AI insights temporarily unavailable">
            <Suspense fallback={<InsightsSkeleton />}>
              <LazyInsightsSection
                loading={loading}
                realtimeData={realtimeData}
                lastUpdate={lastUpdate}
              />
            </Suspense>
          </ErrorBoundary>
        </ScrollView>

        {/* Notification Test Panel - only visible in development
        <NotificationTestPanel /> */}
      </GlobalWrapper>
    </>
  );
}
