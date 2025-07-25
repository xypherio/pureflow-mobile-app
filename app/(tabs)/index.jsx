import AlertsCard from "@components/alerts-card";
import StatusCard from "@components/device-status-card.jsx";
import WaterQualityGauge from "@components/gauge-card";
import GlobalWrapper from "@components/global-wrapper";
import LineChartCard from "@components/linechart-card";
import RealTimeData from "@components/realtime-data-cards";
import PureFlowLogo from "@components/ui-header";
import { useAlerts } from "@contexts/AlertContext";

import { globalStyles } from "@styles/globalStyles";
import { ScrollView, Text, View } from "react-native";

const sectionLabelStyle = {
  fontSize: 12,
  color: "#1a2d51",
  marginBottom: 8,
};

export default function HomeScreen() {
  
  const { alerts, loading, error, sensorData } = useAlerts();

  return (
    <GlobalWrapper style={globalStyles.pageBackground}>
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
          <AlertsCard alerts={alerts} />
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
          <LineChartCard data={[]} />
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
