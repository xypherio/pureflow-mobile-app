import ForecastCard from "@dataDisplay/ForecastCard";
import InsightsCard from "@dataDisplay/InsightsCard";
import ForecastDetailModal from "@ui/ForecastDetailModal";
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import WeatherBanner from "@ui/WeatherBanner";

import { generateInsight } from "@services/ai/geminiAPI"; // Import generateInsight
import { getMockForecast } from "@services/mockForecastService";
import React, { useEffect, useState } from "react"; // Add useEffect and useState
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedParam, setSelectedParam] = React.useState(null);
  const [forecastDetails, setForecastDetails] = React.useState(null);
  const [forecastPredicted, setForecastPredicted] = React.useState(null);
  const [geminiResponse, setGeminiResponse] = useState(null); // State for Gemini response
  const [isGeminiLoading, setIsGeminiLoading] = useState(false); // State for Gemini loading

  React.useEffect(() => {
    (async () => {
      const result = await getMockForecast("6h");
      setForecastDetails(result.details);
      setForecastPredicted(result.predicted);
    })();
  }, []);

  // Fetch Gemini insights when forecastPredicted data is available
  useEffect(() => {
    if (forecastPredicted) {
      const getForecastInsight = async () => {
        setIsGeminiLoading(true);
        setGeminiResponse(null);
        try {
          const insight = await generateInsight(forecastPredicted, "forecast-overall-insight"); // Pass forecastPredicted and unique componentId
          setGeminiResponse(insight);
          console.log("Forecast Gemini API Response:", insight);
        } catch (error) {
          console.error("Error fetching Forecast Gemini insight:", error);
          setGeminiResponse(null);
        } finally {
          setIsGeminiLoading(false);
        }
      };
      getForecastInsight();
    } else {
      setGeminiResponse(null);
    }
  }, [forecastPredicted]);

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

          {isGeminiLoading ? (
            <ActivityIndicator size="large" color="#4a90e2" style={{ marginTop: 20 }} />
          ) : geminiResponse ? (
            <>
              {/* Overall Forecast Insight Card */}
              <InsightsCard
                type="info"
                title="Overall Forecast Insight"
                description={geminiResponse?.insights?.overallInsight || ""}
                timestamp={geminiResponse?.insights?.timestamp}
                componentId="forecast-overall-insight" // Unique componentId
                autoRefresh={true} // Allow auto-refresh for forecast insights
                sensorData={forecastPredicted} // Pass the entire forecastPredicted for overall insights
              />
              {/* Individual Parameter Forecast Insight Cards */}
              {geminiResponse?.suggestions?.map((suggestion, index) => (
                <InsightsCard
                  key={suggestion.parameter || index}
                  type={suggestion.status}
                  title={`${suggestion.parameter} Forecast Insight`}
                  description={suggestion.recommendation}
                  timestamp={geminiResponse?.insights?.timestamp}
                  componentId={`forecast-param-insight-${suggestion.parameter}`} // Unique componentId
                  autoRefresh={true} // Allow auto-refresh for forecast insights
                  sensorData={{ [suggestion.parameter.toLowerCase()]: forecastPredicted?.[suggestion.parameter] }} // Pass individual parameter data
                />
              ))}
            </>
          ) : (
            <Text>Failed to load forecast insights. Please check your Gemini API quota or try again later.</Text>
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
