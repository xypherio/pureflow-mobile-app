import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// UI Components
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import WeatherBanner from "@ui/WeatherBanner";

// Custom Hooks
import useForecastService from "@hooks/useForecastService";
import useForecastInsights from "@hooks/useForecastInsights";

// Services
import ForecastService from "@services/core/ForecastService";

// Sub-components
import ForecastErrorMessages from "@components/sections/ForecastErrorMessagesSection";
import DataSourceIndicator from "@components/sections/ForecastDataSourceIndicatorSection";
import ForecastParameters from "@components/sections/ForecastParametersSection";
import ParameterDetails from "@components/sections/ForecastParameterDetailsSection";
import ForecastInsights from "@components/sections/ForecastInsightsSection";

export default function ForecastScreen() {
  // Core forecast data and logic
  const {
    forecastPredicted,
    trends,
    predictionError,
    forecastDataAvailable,
    dataSource,
    loadHistoricalData,
    makePrediction,
  } = useForecastService();

  // Prediction callback ref to avoid interval resets
  const predictionCallbackRef = useRef();

  useEffect(() => {
    predictionCallbackRef.current = makePrediction;
  }, [makePrediction]);

  // Track if we've ever successfully loaded data
  const [hasEverFetchedOnce, setHasEverFetchedOnce] = useState(false);

  useEffect(() => {
    if (forecastPredicted && !hasEverFetchedOnce) {
      setHasEverFetchedOnce(true);
    }
  }, [forecastPredicted, hasEverFetchedOnce]);

  // Selected parameter for details below cards
  const [selectedParam, setSelectedParam] = useState(null);

  // Forecast insights and AI logic
  const { geminiResponse, isGeminiLoading } = useForecastInsights(forecastPredicted, dataSource);

  // Initial load and prediction setup
  useEffect(() => {
    const init = async () => {
      await loadHistoricalData();
      const cb = predictionCallbackRef.current;
      if (cb) await cb();
    };
    init();
  }, []); 

  // Set up automated prediction refresh (every 4 hours)
  useEffect(() => {
    const cleanup = ForecastService.setupAutomatedRefresh(() => {
      const cb = predictionCallbackRef.current;
      if (cb) cb();
    }, 4);
    return cleanup;
  }, []); // empty deps for interval setup

  return (
    <GlobalWrapper style={{ flex: 1 }}>
      <PureFlowLogo
        weather={{
          label: "Forecast View",
          temp: "--°C",
          icon: "partly",
        }}
      />

      {/* Weather Summary Section */}
      <View>
        <WeatherBanner showCurrentWeather={true} city="Bogo City" />
      </View>

      <ForecastErrorMessages
        predictionError={predictionError}
        hasEverFetchedOnce={hasEverFetchedOnce}
        forecastDataAvailable={forecastDataAvailable}
      />

      <DataSourceIndicator
        forecastDataAvailable={forecastDataAvailable}
        dataSource={dataSource}
      />

      <ForecastParameters
        forecastPredicted={forecastPredicted}
        selectedParam={selectedParam}
        setSelectedParam={setSelectedParam}
        trends={trends}
      />

      <ParameterDetails
        selectedParam={selectedParam}
        setSelectedParam={setSelectedParam}
        geminiResponse={geminiResponse}
      />

      <ForecastInsights
        isGeminiLoading={isGeminiLoading}
        geminiResponse={geminiResponse}
        forecastDataAvailable={forecastDataAvailable}
        forecastPredicted={forecastPredicted}
      />
    </GlobalWrapper>
  );
}
