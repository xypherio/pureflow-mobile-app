import ForecastCard from "@components/forecastCard";
import ForecastInsights from "@components/forecastInsights";
import ForecastLineChart from "@components/forecastLineChart";
import GlobalWrapper from "@components/globalWrapper";
import PureFlowLogo from "@components/pureflowLogo";
import WeatherBanner from "@components/weatherBanner";
import globalStyles from "@styles/globalStyles";

import { ScrollView, View } from "react-native";

export default function HomeScreen() {
  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff]">
      {/* Header */}
      <View className="mb-4 items-start">
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
        />
      </View>

      {/* Weather Summary Toggle*/}
      <WeatherBanner forecast="Light rain expected at 4PM. Humidity: 82%, Temp: 30°C." />

      {/* Forecast Cards Section*/}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ForecastCard style={{...globalStyles.boxShadow}} title="pH" value="7.3" trend="rising" />
        <ForecastCard title="Temperature" value="29.5°C" trend="falling" />
        <ForecastCard title="Turbidity" value="12 NTU" trend="rising" />
      </ScrollView>

      {/* Chart Section*/}
      <ForecastLineChart style={{...globalStyles.boxShadow}} />

      <ForecastInsights
        type="warning"
        message="Turbidity levels are expected to increase at midnight. Consider enabling filtration protocol."
      />

      <ForecastInsights
        type="suggestion"
        message="Stable water conditions detected. This is a good time to recalibrate your sensors."
      />
    </GlobalWrapper>
  );
}
