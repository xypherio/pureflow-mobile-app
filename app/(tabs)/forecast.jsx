import ForecastCard from "@components/forecastCard";
import ForecastInsights from "@components/forecastInsights";
import GlobalWrapper from "@components/globalWrapper";
import LineChartCard from "@components/linechartCard";
import PureFlowLogo from "@components/pureflowLogo";
import WeatherBanner from "@components/weatherBanner";

import { ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <GlobalWrapper style={{ flex: 1, backgroundColor: '#e6fbff' }}>
      {/* Header */}
      <View style={{ alignItems: 'flex-start' }}>
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
        />
      </View>

      {/* Weather Summary Section */}
      <View>
        <WeatherBanner forecast="Light rain expected at 4PM. Humidity: 82%, Temp: 30°C." />
      </View>

      {/* Forecast Parameters Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#1a2d51', marginBottom: 5 }}>Forecast Parameters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ForecastCard title="pH" value="7.3" trend="rising" />
          <ForecastCard title="Temperature" value="29.5°C" trend="falling" />
          <ForecastCard title="Turbidity" value="12 NTU" trend="rising" />
          <ForecastCard title="Salinity" value="35 ppt" trend="rising" />
        </ScrollView>
      </View>

      {/* Forecast Trends Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#1a2d51', marginBottom: -8 }}>Forecast Trends</Text>
        <LineChartCard></LineChartCard>
      </View>

      {/* Forecast Insights Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#1a2d51', marginBottom: -8 }}>Forecast Insights</Text>
        <ForecastInsights
          type="warning"
          message="Turbidity levels are expected to increase at midnight. Consider enabling filtration protocol."
        />

        <ForecastInsights
          type="suggestion"
          message="Stable water conditions detected. This is a good time to recalibrate your sensors."
        />
      </View>
    </GlobalWrapper>
  );
}
