import { listenToForegroundMessages, listenToBackgroundMessages, requestUserPermission } from "@/services/pushNotifications";
import { globalStyles } from "@/styles/globalStyles";
import { useData } from "@contexts/DataContext";
import AlertsCard from "@data-display/alerts-card";
import InsightsCard from "@data-display/insights-card";
import LineChartCard from "@data-display/linechart-card";
import RealTimeData from "@data-display/realtime-data-cards";
import StatusCard from "@ui/device-status-card.jsx";
import GlobalWrapper from "@ui/global-wrapper";
import PureFlowLogo from "@ui/ui-header";
import { useEffect } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

const insights = [
  {
    type: "positive",
    title: "Water Quality Excellent",
    description:
      "All major parameters are within optimal ranges. Your water system is performing well.",
    timestamp: "1 hour ago",
  },
  {
    type: "info",
    title: "Daily Report Available",
    description:
      "Your comprehensive daily water quality report is ready for download.",
    timestamp: "30 minutes ago",
  },
];

export default function HomeScreen() {
  const {
    alerts,
    sensorData,
    loading,
    error,
    refreshData,
    lastUpdate,
    getHomepageAlerts,
  } = useData();

  useEffect(() => {
    // Initialize Firebase and notifications
    const setupNotifications = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestUserPermission();
        
        if (hasPermission) {
          console.log('Notification permissions granted');
          
          // Get FCM token (you'll need to pass the current user's ID)
          // const fcmToken = await getFcmToken(currentUserId);
          // console.log('FCM Token:', fcmToken);
          
          // Set up message listeners
          const unsubscribeForeground = listenToForegroundMessages();
          listenToBackgroundMessages();
          
          return () => {
            if (unsubscribeForeground && typeof unsubscribeForeground === 'function') {
              unsubscribeForeground();
            }
          };
        } else {
          console.log('Notification permissions denied');
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    // Call the setup function
    const cleanup = setupNotifications();
    
    // Cleanup function
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && fn());
      }
    };
  }, []);

  return (
    <>
      {/* Header */}
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
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
            <RealTimeData data={sensorData} />
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

            {insights.map((insight, index) => (
              <InsightsCard
                key={index}
                type={insight.type}
                title={insight.title}
                description={insight.description}
                action={insight.action}
                onActionPress={() => handleExportAction(insight.action)}
                timestamp={insight.timestamp}
              />
            ))}
          </View>
        </ScrollView>
      </GlobalWrapper>
    </>
  );
}
