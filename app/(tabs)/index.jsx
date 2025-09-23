import NotificationTestPanel from "@components/NotificationTestPanel";
import { useData } from "@contexts/DataContext";
import AlertsCard from "@dataDisplay/AlertsCard";
import InsightsCard from "@dataDisplay/InsightsCard";
import LineChartCard from "@dataDisplay/LinechartCard";
import RealtimeDataCards from "@dataDisplay/RealtimeDataCards";
import { useNotifications } from "@hooks/useNotifications";
import { useWaterQualityNotifications } from "@hooks/useWaterQualityNotifications";
import { globalStyles } from "@styles/globalStyles";
import StatusCard from "@ui/DeviceStatusCard.jsx";
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import { useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

export default function HomeScreen() {
  const {
    alerts,
    sensorData,
    loading,
    error,
    refreshData,
    lastUpdate,
    getHomepageAlerts,
    realtimeData,
  } = useData();

  const {
    isInitialized,
    hasPermission,
    unreadCount,
    addNotificationListener,
    requestPermission,
  } = useNotifications();

  useWaterQualityNotifications();

  useEffect(() => {
    // Initialize notifications and request permission if needed
    const setupNotifications = async () => {
      try {
        if (!hasPermission) {
          console.log("Requesting notification permissions...");
          const result = await requestPermission();
          if (result.success) {
            console.log("✅ Notification permissions granted");
          } else {
            console.log("❌ Notification permissions denied");
          }
        }

        // Set up notification listeners
        const receivedListener = addNotificationListener(
          "received",
          (notification) => {
            console.log(
              "📱 Home screen received notification:",
              notification.request.content.title
            );

            // You can add custom logic here for handling received notifications
            // For example, refresh data, show in-app alerts, etc.
          }
        );

        const responseListener = addNotificationListener(
          "response",
          (response) => {
            console.log(
              "👆 Home screen notification tapped:",
              response.notification.request.content.title
            );

            // Handle notification tap - navigate to specific screen, refresh data, etc.
            const notificationData = response.notification.request.content.data;

            switch (notificationData?.type) {
              case "water_quality_alert":
                // Navigate to specific parameter or alerts screen
                console.log("Navigate to water quality alerts");
                break;
              case "device_offline":
                // Show device status or troubleshooting
                console.log("Navigate to device status");
                break;
              case "maintenance_reminder":
                // Navigate to maintenance screen
                console.log("Navigate to maintenance");
                break;
              default:
                console.log("Handle general notification tap");
            }
          }
        );

        // Return cleanup function
        return () => {
          if (receivedListener?.remove) receivedListener.remove();
          if (responseListener?.remove) responseListener.remove();
        };
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };

    if (isInitialized) {
      const cleanup = setupNotifications();
      return () => {
        if (cleanup && typeof cleanup.then === "function") {
          cleanup.then((fn) => fn && fn());
        } else if (typeof cleanup === "function") {
          cleanup();
        }
      };
    }
  }, [
    isInitialized,
    hasPermission,
    addNotificationListener,
    requestPermission,
  ]);

  
  return (
    <>
      {/* Header */}
      <PureFlowLogo
        weather={{
          label: "Light Rain",
          temp: "30°C",
          icon: "partly",
        }}
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
          <View style={{ marginBottom: 16 }}>
            <Text style={sectionLabelStyle}>System Status</Text>
            <StatusCard status="Active" battery="Low" />
          </View>

          {/* Critical Alerts Section */}
          <View style={{ marginBottom: 12 }}>
            <Text style={sectionLabelStyle}>Active Alerts</Text>
            <AlertsCard alerts={getHomepageAlerts()} />
          </View>

          {/* Real-Time Data Section */}
          <View style={{ marginBottom: 12 }}>
            <Text style={sectionLabelStyle}>Real-Time Parameters</Text>
            <RealtimeDataCards data={sensorData} />
          </View>

          {/* Historical Trends Section */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ ...sectionLabelStyle, marginBottom: -10 }}>
              Daily Trends
            </Text>
            <LineChartCard />
          </View>

          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: "#1a2d51" }}>
                Insights & Recommendations
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#4a90e2"
                style={{ marginTop: 20 }}
              />
            ) : (
              <InsightsCard
                type="info"
                title="Water Quality Insights"
                sensorData={realtimeData} // Use realtimeData for insights
                timestamp={lastUpdate}
                componentId="home-insights" // Unique componentId
                autoRefresh={true}
              />
            )}
          </View>
        </ScrollView>
      </GlobalWrapper>
      
      {/* Development Test Panel - Only visible in development mode */}
      <NotificationTestPanel />
    </>
  );
}
