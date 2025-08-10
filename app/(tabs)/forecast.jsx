import ForecastCard from "@data-display/forecast-card";
import GlobalWrapper from "@ui/global-wrapper";
import InsightsCard from "@data-display/insights-card";
import LineChartCard from "@data-display/linechart-card";
import PureFlowLogo from "@ui/ui-header";
import WeatherBanner from "@ui/weather-banner";

import { ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  
  const insights = [
    {
      type: "positive",
      title: "AI Forecast: Optimal Water Quality Maintained",
      description:
        "ML predicts stable conditions for 48h. pH (7.2-7.4), DO (6.8-7.2 mg/L) optimal. No action needed.",
      suggestion: "Continue current maintenance schedule. Monitor for any sudden changes.",
      timestamp: "Updated 15 min ago",
    },
    {
      type: "warning",
      title: "AI Alert: Potential Turbidity Spike Predicted",
      description:
        "ML detects 23% turbidity increase in 6-8h. 87% accuracy. Recommend filter maintenance.",
      suggestion: "Schedule filter replacement within 4 hours. Increase monitoring frequency to hourly.",
      action: "View AI Analysis",
      timestamp: "Updated 1 hour ago",
    },
    {
      type: "info",
      title: "AI Insights: Seasonal Pattern Detected",
      description:
        "Neural network shows rainfall-conductivity correlation. Monitor salinity during weather events.",
      suggestion: "Prepare backup filtration systems. Stock up on treatment chemicals.",
      action: "View Pattern Analysis",
      timestamp: "Updated 3 hours ago",
    },
    {
      type: "warning",
      title: "AI Warning: pH Drift Pattern Identified",
      description:
        "RNN detects pH drift. Predicts drop to 6.8 in 12h. 91% accuracy. Consider pH adjustment.",
      suggestion: "Add pH buffer solution within 6 hours. Monitor pH every 2 hours.",
      action: "View Trend Analysis",
      timestamp: "Updated 6 hours ago",
    },
  ];

  return (
    <GlobalWrapper style={{ flex: 1, backgroundColor: "#e6fbff" }}>
      {/* Header */}
      <View style={{ alignItems: "flex-start" }}>
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
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 12, color: "#1a2d51", marginBottom: 10 }}>
          Forecast Parameters
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ForecastCard title="pH" value="7.3" trend="rising" />
          <ForecastCard title="Temperature" value="29.5°C" trend="falling" />
          <ForecastCard title="Turbidity" value="12 NTU" trend="rising" />
          <ForecastCard title="Salinity" value="35 ppt" trend="rising" />
        </ScrollView>
      </View>

      {/* Forecast Trends Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: "#1a2d51", marginBottom: -10 }}>
          Forecast Trends
        </Text>
        <LineChartCard></LineChartCard>
      </View>

      {/* Forecast Insights Section */}
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#1a2d51" }}>
            Insights & Suggestions
          </Text>
        </View>

        {insights.map((insight, index) => (
          <InsightsCard
            key={index}
            type={insight.type}
            title={insight.title}
            description={insight.description}
            suggestion={insight.suggestion}
            action={insight.action}
            onActionPress={() => {
              console.log("button pressed");
            }}
            timestamp={insight.timestamp}
          />
        ))}
      </View>
    </GlobalWrapper>
  );
}
