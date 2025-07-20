import AlertsCard from "@components/alerts-card";
import StatusCard from "@components/device-status-card.jsx";
import WaterQualityGauge from "@components/gauge-card";
import GlobalWrapper from "@components/global-wrapper";
import LineChartCard from "@components/linechart-card";
import RealTimeData from "@components/realtime-data-cards";
import PureFlowLogo from "@components/ui-header";

import { ScrollView, Text, View } from "react-native";

// Reusable section label style
const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

export default function HomeScreen() {
  return (
    <GlobalWrapper style={{ flex: 1, backgroundColor: "#e6fbff" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
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
          <AlertsCard />
        </View>

        {/* Real-Time Data Section */}
        <View style={{ marginBottom: 12 }}>
          <Text style={sectionLabelStyle}>Real-Time Parameters</Text>
          <RealTimeData />
        </View>

        {/* Water Quality Gauge */}
        <View style={{ marginBottom: 12 }}>
          <Text style={sectionLabelStyle}>Overall Water Quality</Text>
          <WaterQualityGauge
            percentage={43}
            parameters={{
              temp: 80,
              turbidity: 60,
              ph: 50,
              salinity: 40,
            }}
          />
        </View>

        {/* Historical Trends Section */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ ...sectionLabelStyle, marginBottom: -10 }}>
            Historical Trends
          </Text>
          <LineChartCard />
        </View>
      </ScrollView>
    </GlobalWrapper>
  );
}
