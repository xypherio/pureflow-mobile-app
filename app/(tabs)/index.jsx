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

  // Debug logging for alerts
  useEffect(() => {
    console.log('🔍 Index.jsx - Current alerts:', {
      alertsCount: alerts?.length || 0,
      alerts: alerts,
      hasAlerts: !!alerts && alerts.length > 0,
      alertsWithParameters: alerts?.filter(a => a && a.parameter) || []
    });
  }, [alerts]);

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
            try {
              const content = notification?.request?.content;
              const title = content?.title || "Unknown Notification";
              const body = content?.body || "";
              const notificationData = content?.data || {};

              console.log("📱 Home screen received notification:", {
                title,
                body,
                data: notificationData,
              });

              // You can add custom logic here for handling received notifications
              // For example, refresh data, show in-app alerts, update UI, etc.
              // This triggers when notification is received while app is in foreground
            } catch (error) {
              console.error("Error handling received notification:", error);
            }
          }
        );

        const responseListener = addNotificationListener(
          "response",
          (response) => {
            try {
              // Extract notification content with proper error handling
              const content = response.notification?.request?.content;
              const title = content?.title || "Unknown Notification";
              const body = content?.body || "";
              const notificationData = content?.data || {};

              console.log("👆 Home screen notification tapped:", {
                title,
                body,
                data: notificationData,
                actionIdentifier: response.actionIdentifier,
              });

              // Handle notification tap - navigate to specific screen, refresh data, etc.
              switch (notificationData?.type) {
                case "water_quality_alert":
                  // Navigate to specific parameter or alerts screen
                  console.log("Navigate to water quality alerts");
                  break;
                case "device_offline":
                case "device_online":
                  // Show device status or troubleshooting
                  console.log("Navigate to device status");
                  break;
                case "maintenance_reminder":
                  // Navigate to maintenance screen
                  console.log("Navigate to maintenance");
                  break;
                case "forecast_alert":
                  // Navigate to forecast screen
                  console.log("Navigate to forecast alerts");
                  break;
                default:
                  console.log("Handle general notification tap");
              }
            } catch (error) {
              console.error("Error handling notification response:", error);
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
            <StatusCard status="Active" battery="Low" solarPowered={true} />
          </View>

          {/* Critical Alerts Section */}
          <View style={{ marginBottom: 12 }}>
            <Text style={sectionLabelStyle}>Active Alerts</Text>
            <AlertsCard alerts={alerts} interval={2500} />
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
    </>
  );
}
