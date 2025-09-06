import ForecastCard from "@data-display/forecast-card";
import InsightsCard from "@data-display/insights-card";
import ForecastDetailModal from "@ui/forecast-detail-modal";
import GlobalWrapper from "@ui/global-wrapper";
import PureFlowLogo from "@ui/ui-header";
import WeatherBanner from "@ui/weather-banner";

import { getMockForecast } from "@services/mockForecastService";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedParam, setSelectedParam] = React.useState(null);
  const [forecastDetails, setForecastDetails] = React.useState(null);
  const [forecastPredicted, setForecastPredicted] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const result = await getMockForecast("6h");
      setForecastDetails(result.details);
      setForecastPredicted(result.predicted);
    })();
  }, []);

  function openDetails(paramKey) {
    if (forecastDetails && forecastDetails[paramKey]) {
      setSelectedParam({ key: paramKey, ...forecastDetails[paramKey] });
    } else {
      setSelectedParam({ key: paramKey });
    }
    setIsModalVisible(true);
  }

  function closeDetails() {
    setIsModalVisible(false);
  }

  function formatValue(key, value) {
    if (value === null || value === undefined) return "-";
    if (key === "pH") return String(value);
    if (key === "Temperature") return `${value}°C`;
    if (key === "Turbidity") return `${value} NTU`;
    if (key === "Salinity") return `${value} ppt`;
    return String(value);
  }

  return (
    <>
      <PureFlowLogo
        weather={{
          label: "Light Rain",
          temp: "30°C",
          icon: "partly",
        }}
      />

      <GlobalWrapper style={{ flex: 1 }}>
        {/* Weather Summary Section */}
        <View>
          <WeatherBanner forecast="Light rain expected at 4PM. Humidity: 82%, Temp: 30°C." />
        </View>

        {/* Forecast Parameters Section */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: "#1a2d51", marginBottom: 10 }}>
            Forecast Parameters
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ForecastCard
              title="pH"
              value={formatValue("pH", forecastPredicted?.pH)}
              trend="rising"
              onPress={() => openDetails("pH")}
              breachPredicted={!!forecastDetails?.["pH"]?.breachPredicted}
            />
            <ForecastCard
              title="Temperature"
              value={formatValue("Temperature", forecastPredicted?.Temperature)}
              trend="falling"
              onPress={() => openDetails("Temperature")}
              breachPredicted={
                !!forecastDetails?.["Temperature"]?.breachPredicted
              }
            />
            <ForecastCard
              title="Turbidity"
              value={formatValue("Turbidity", forecastPredicted?.Turbidity)}
              trend="rising"
              onPress={() => openDetails("Turbidity")}
              breachPredicted={
                !!forecastDetails?.["Turbidity"]?.breachPredicted
              }
            />
            <ForecastCard
              title="Salinity"
              value={formatValue("Salinity", forecastPredicted?.Salinity)}
              trend="rising"
              onPress={() => openDetails("Salinity")}
              breachPredicted={!!forecastDetails?.["Salinity"]?.breachPredicted}
            />
          </ScrollView>
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
            <Text
              style={{
                fontSize: 12,
                color: "#1a2d51",
                marginBottom: 5,
                marginTop: 10,
              }}
            >
              Insights & Suggestions
            </Text>
          </View>

          {forecastPredicted ? (
            <InsightsCard
              type="info"
              title="Forecast Insights"
              sensorData={forecastPredicted}
            />
          ) : (
            <ActivityIndicator size="large" color="#4a90e2" style={{ marginTop: 20 }} />
          )}
        </View>

        <ForecastDetailModal
          visible={isModalVisible}
          onClose={closeDetails}
          param={selectedParam}
        />
      </GlobalWrapper>
    </>
  );
}
