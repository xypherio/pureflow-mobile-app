import StatusCard from "@components/datmStatusCard.jsx";
import GlobalWrapper from "@components/globalWrapper";
import LineChartCard from "@components/linechartCard";
import PureFlowLogo from "@components/pureflowLogo";
import RealTimeData from "@components/rtDataCards";

import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <GlobalWrapper style={{ flex: 1, backgroundColor: '#e6fbff' }}>
      <View style={{ alignItems: 'flex-start' }}>
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
        />
      </View>

      {/* System Status Section */}
      <View>
        <StatusCard status="Active" battery="Low" />
      </View>

      {/* Real-Time Data Section */}
      <View style={{ marginBottom: 5 }}>
        <Text style={{ fontSize: 12, color: '#1a2d51', marginBottom: 8 }}>Real-Time Data</Text>
        <RealTimeData />
      </View>

      {/* Historical Trends Section */}
      <View style={{ marginBottom: 5 }}>
        <Text style={{ fontSize: 12, color: '#1a2d51', marginBottom: -8 }}>Historical Trends</Text>
        <LineChartCard>
        </LineChartCard>
      </View>

    </GlobalWrapper>
  );
}
