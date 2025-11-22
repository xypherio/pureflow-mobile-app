import DashboardSection from "@components/sections/DashboardSection";
import InsightsSection from "@components/sections/InsightsSection";
import SystemStatusSection from "@components/sections/SystemStatusSection";
import { useData } from "@contexts/DataContext";
import { useDeviceStatus } from "@hooks/useDeviceStatus";
import { useNotifications } from "@hooks/useNotifications";
import { useNotificationSetup } from "@hooks/useNotificationSetup";
import { useWaterQualityNotifications } from "@hooks/useWaterQualityNotifications";
import { globalStyles } from "@styles/globalStyles";
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import { getWeatherInfo } from "@utils/sensorDataUtils";
import {
  RefreshControl,
  ScrollView,
} from "react-native";

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

  // Device status computed from realtime data
  const { isDatmActive, isSolarPowered } = useDeviceStatus(realtimeData);

  // Notifications setup
  const {
    isInitialized,
    unreadCount,
    addNotificationListener,
  } = useNotifications();
  useWaterQualityNotifications();
  useNotificationSetup(isInitialized, addNotificationListener);

  // Dynamic weather info based on rain status
  const weatherInfo = getWeatherInfo(realtimeData?.isRaining || 0);

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
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshData}
              colors={["#4a90e2"]}
              tintColor="#4a90e2"
            />
          }
        >
          {/* System Status Section */}
          <SystemStatusSection
            isDatmActive={isDatmActive}
            isSolarPowered={isSolarPowered}
            isRaining={realtimeData?.isRaining || 0}
          />

          {/* Dashboard Sections */}
          <DashboardSection
            alerts={alerts}
            realtimeData={realtimeData}
            sensorData={sensorData}
          />

          {/* Insights Section */}
          <InsightsSection
            loading={loading}
            realtimeData={realtimeData}
            lastUpdate={lastUpdate}
          />
        </ScrollView>

        {/* Notification Test Panel - only visible in development
        <NotificationTestPanel /> */}
      </GlobalWrapper>
    </>
  );
}
