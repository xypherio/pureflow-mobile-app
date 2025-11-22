import ForecastCard from "@dataDisplay/ForecastCard";
import InsightsCard from "@dataDisplay/InsightsCard";
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import WeatherBanner from "@ui/WeatherBanner";

import useForecastService from "@hooks/useForecastService";
import { generateInsight } from "@services/ai/geminiAPI";
import { addForecastToFirestore } from "@services/firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  // UI State Management (Single Responsibility: Handle modal and navigation state)
  const [selectedParam, setSelectedParam] = React.useState(null);
  const [forecastDetails, setForecastDetails] = React.useState(null);

  // AI Insights States (Single Responsibility: Handle AI-generated insights)
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // Use custom hook for prediction logic (Single Responsibility Principle)
  const {
    forecastPredicted,
    isLoading,
    predictionError,
    hasEverFetchedOnce,
    forecastDataAvailable,
    initializePrediction,
  } = useForecastService();

  // Initialize component and set up automated prediction refresh
  React.useEffect(() => {
    // Use the custom hook's initialization method
    const cleanup = initializePrediction();

    // Return cleanup function from the hook
    return cleanup;
  }, []);

  // Generate AI insights whenever new predictions are available
  useEffect(() => {
    if (forecastPredicted) {
      const getForecastInsight = async () => {
        setIsGeminiLoading(true);
        setGeminiResponse(null);
        try {
          // Generate AI-powered insights and recommendations using Gemini API
          const insight = await generateInsight(
            forecastPredicted,
            "forecast-overall-insight"
          );
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

      // Send forecast data to Firebase
      const sendForecastToFirebase = async () => {
        try {
          await addForecastToFirestore(forecastPredicted);
          console.log("Forecast data successfully sent to Firebase");
        } catch (error) {
          console.error("Error sending forecast data to Firebase:", error);
        }
      };
      sendForecastToFirebase();
    } else {
      setGeminiResponse(null);
    }
  }, [forecastPredicted]);

  /**
   * Opens detailed forecast modal for a specific parameter
   * @param {string} paramKey - The parameter key (pH, Temperature, Turbidity, Salinity)
   */
  function openDetails(paramKey) {
    if (forecastDetails && forecastDetails[paramKey]) {
      setSelectedParam({ key: paramKey, ...forecastDetails[paramKey] });
    } else {
      setSelectedParam({ key: paramKey });
    }
    setIsModalVisible(true);
  }



  /**
   * Formats parameter values for display with appropriate units
   * @param {string} key - Parameter name (pH, Temperature, Turbidity, Salinity)
   * @param {number} value - Raw parameter value
   * @returns {string} - Formatted value with units or "-" if null/undefined
   */
  function formatValue(key, value) {
    if (value === null || value === undefined) return "-";
    const roundedValue = Math.round(value * 100) / 100;
    if (key === "pH") return String(roundedValue);
    if (key === "Temperature") return `${roundedValue}°C`;
    if (key === "Turbidity") return `${roundedValue} NTU`;
    if (key === "Salinity") return `${roundedValue} ppt`;
    return String(roundedValue);
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
          <WeatherBanner showCurrentWeather={true} city="Bogo City" />
        </View>

        {/* Error Message Display */}
        {predictionError && hasEverFetchedOnce && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              <Text style={{ fontWeight: "bold" }}>
                Unable to update forecast:
              </Text>{" "}
              {predictionError}. Showing last available forecast data.
            </Text>
          </View>
        )}

        {/* No Data Available Message */}
        {predictionError && !hasEverFetchedOnce && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              Please come back later when the forecast is available.
            </Text>
          </View>
        )}

        {/* Forecast Parameters Section */}
        <View style={styles.forecastParametersContainer}>
          <Text style={styles.sectionTitle}>Forecast Parameters</Text>
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
          <View style={styles.insightsHeader}>
            <Text style={styles.sectionTitle}>Insights & Suggestions</Text>
          </View>

          {isGeminiLoading ? (
            <ActivityIndicator
              size="large"
              color="#4a90e2"
              style={styles.loadingIndicator}
            />
          ) : geminiResponse ? (
            <>
              {/* Overall Forecast Insight Card */}
              <InsightsCard
                type="info"
                title="Overall Forecast Insight"
                description={geminiResponse?.insights?.overallInsight || ""}
                timestamp={geminiResponse?.insights?.timestamp}
                componentId="forecast-overall-insight" 
                autoRefresh={true} 
                sensorData={forecastPredicted} 
              />
              {/* Individual Parameter Forecast Insight Cards */}
              {geminiResponse?.suggestions?.map((suggestion, index) => (
                <InsightsCard
                  key={suggestion.parameter || index}
                  type={suggestion.status}
                  title={`${suggestion.parameter} Forecast Insight`}
                  description={suggestion.recommendation}
                  timestamp={geminiResponse?.insights?.timestamp}
                  componentId={`forecast-param-insight-${suggestion.parameter}`} 
                  autoRefresh={true} 
                  sensorData={{
                    [suggestion.parameter.toLowerCase()]:
                      forecastPredicted?.[suggestion.parameter],
                  }} 
                />
              ))}
            </>
          ) : (
            <Text style={styles.noDataText}>
              {forecastDataAvailable
                ? "Failed to load forecast insights. Please check your Gemini API quota or try again later."
                : "No forecast available yet."}
            </Text>
          )}
        </View>
      </GlobalWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: "#FFD2D2",
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#D9534F",
  },
  errorText: {
    color: "#A94442",
    fontSize: 12,
  },
  noDataContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 5,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  noDataText: {
    color: "#856404",
    fontSize: 12,
    textAlign: "center",
  },
  forecastParametersContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 10,
  },
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loadingIndicator: {
    marginTop: 20,
  },
});
