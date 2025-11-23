import React, { Suspense, useMemo, useCallback } from "react";
import { useData } from "@contexts/DataContext";
import { useDeviceStatus } from "@hooks/useDeviceStatus";
import { useNotifications } from "@hooks/useNotifications";
import { useNotificationSetup } from "@hooks/useNotificationSetup";
import { useWaterQualityNotifications } from "@hooks/useWaterQualityNotifications";

import { globalStyles } from "@styles/globalStyles";
import GlobalWrapper from "@ui/GlobalWrapper";
import ErrorBoundary from "@ui/ErrorBoundary";
import RefreshControlWrapper from "@ui/RefreshControlWrapper";
import WeatherBadge from "@ui/WeatherBadge";
import PureFlowLogo from "@ui/UiHeader";
import SystemStatusSection from "@components/sections/SystemStatusSection";
import { getWeatherInfo } from "@utils/sensorDataUtils";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";

// Loading placeholder component for lazy loading fallback
const LoadingPlaceholder = React.memo(({ message }) => (
  <View style={{
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120
  }}>
    <ActivityIndicator size="large" color="#4a90e2" />
    <Text style={{
      marginTop: 10,
      fontSize: 16,
      color: '#64748b',
      textAlign: 'center'
    }}>
      {message}
    </Text>
  </View>
));

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

  // Memoized weather info computation for performance
  const weatherInfo = useMemo(() =>
    getWeatherInfo(realtimeData?.isRaining || 0),
    [realtimeData?.isRaining]
  );

  // Note: Using simple lazy loading instead of viewport-based loading
  // for better React Native compatibility

  // Memoized refresh handler to prevent recreation
  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  return (
    <>
      {/* Header with dynamic weather */}
      <PureFlowLogo
        weather={weatherInfo}
        notificationBadge={unreadCount > 0 ? unreadCount : null}
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
            <SystemStatusSection
              isDatmActive={isDatmActive}
              isSolarPowered={isSolarPowered}
              isRaining={realtimeData?.isRaining || 0}
            />
          </ErrorBoundary>

          {/* Dashboard Sections - Lazy loaded for better performance */}
          <ErrorBoundary fallbackMessage="Dashboard data temporarily unavailable">
            <Suspense fallback={<LoadingPlaceholder message="Loading dashboard..." />}>
              <LazyDashboardSection
                alerts={alerts}
                realtimeData={realtimeData}
                sensorData={sensorData}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Insights Section - Lazy loaded for better performance */}
          <ErrorBoundary fallbackMessage="AI insights temporarily unavailable">
            <Suspense fallback={<LoadingPlaceholder message="Loading insights..." />}>
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
