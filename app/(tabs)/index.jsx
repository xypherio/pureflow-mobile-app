import { useData } from "@contexts/DataContext";
import AlertsCard from "@dataDisplay/AlertsCard";
import InsightsCard from "@dataDisplay/InsightsCard";
import LineChartCard from "@dataDisplay/LinechartCard";
import RealtimeDataCards from "@dataDisplay/RealtimeDataCards";
import { listenToBackgroundMessages, listenToForegroundMessages, requestUserPermission } from "@services/pushNotifications";
import { globalStyles } from "@styles/globalStyles";
import StatusCard from "@ui/DeviceStatusCard.jsx";
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import { useEffect } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

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

  useEffect(() => {
    // Initialize Firebase and notifications
    const setupNotifications = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestUserPermission();
        
        if (hasPermission) {
          console.log('Notification permissions granted');
          
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
    
    const cleanup = setupNotifications();
    
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
              <ActivityIndicator size="large" color="#4a90e2" style={{ marginTop: 20 }} />
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
