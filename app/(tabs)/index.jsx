import { useData } from "@contexts/DataContext";
import AlertsCard from "@data-display/alerts-card";
import WaterQualityGauge from "@data-display/gauge-card";
import LineChartCard from "@data-display/linechart-card";
import RealTimeData from "@data-display/realtime-data-cards";
import { globalStyles } from "@styles/globalStyles";
import StatusCard from "@ui/device-status-card.jsx";
import GlobalWrapper from "@ui/global-wrapper";
import PureFlowLogo from "@ui/ui-header";
import { RefreshControl, ScrollView, Text, View } from "react-native";

const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

export default function HomeScreen() {
  const { alerts, sensorData, loading, error, refreshData, lastUpdate, getHomepageAlerts } = useData();

  return (
    <GlobalWrapper style={globalStyles.pageBackground}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshData}
            colors={['#4a90e2']}
            tintColor="#4a90e2"
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <PureFlowLogo
            weather={{
              label: "Light Rain",
              temp: "30°C",
              icon: "partly",
            }}
          />
        </View>

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
            Historical Trends
          </Text>
          <LineChartCard />
        </View>

        {/* Water Quality Gauge */}
        <View style={{ marginBottom: 12 }}>
          <Text style={sectionLabelStyle}>Overall Water Quality</Text>
          <WaterQualityGauge
            percentage={65}
            parameters={{
              temp: 80,
              turbidity: 60,
              ph: 50,
              salinity: 40,
            }}
          />
        </View>
      </ScrollView>
    </GlobalWrapper>
  );
}
