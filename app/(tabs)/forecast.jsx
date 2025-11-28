import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

// UI Components
import GlobalWrapper from "@ui/GlobalWrapper";
import PureFlowLogo from "@ui/UiHeader";
import WeatherBanner from "@ui/WeatherBanner";
import SettingsModal from "@components/modals/SettingsModal";
import IssueReportingModal from "@components/modals/IssueReportingModal";
import FeatureRatingModal from "@components/modals/FeatureRatingModal";

// Custom Hooks
import useForecastInsights from "@hooks/useForecastInsights";
import useForecastService from "@hooks/useForecastService";

// Services
import ForecastService from "@services/core/ForecastService";

// Sub-components
import DataSourceIndicator from "@components/sections/ForecastDataSourceIndicatorSection";
import ForecastInsights from "@components/sections/ForecastInsightsSection";
import ParameterDetails from "@components/sections/ForecastParameterDetailsSection";
import ForecastParameters from "@components/sections/ForecastParametersSection";

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

  // Modal states
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [isIssueReportingVisible, setIsIssueReportingVisible] = useState(false);

  const openSettingsModal = useCallback(() => {
    setIsSettingsVisible(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsVisible(false);
  }, []);

  const handleRateApp = useCallback(() => {
    setIsRatingVisible(true);
  }, []);

  const closeRatingModal = useCallback(() => {
    setIsRatingVisible(false);
  }, []);

  const handleReportIssue = useCallback(() => {
    setIsIssueReportingVisible(true);
  }, []);

  const closeIssueReportingModal = useCallback(() => {
    setIsIssueReportingVisible(false);
  }, []);

  return (
    <>
      {/* Modals */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={closeSettingsModal}
        onRateApp={handleRateApp}
        onReportIssue={handleReportIssue}
      />

      <FeatureRatingModal
        visible={isRatingVisible}
        onClose={closeRatingModal}
        onSuccess={closeRatingModal}
      />

      <IssueReportingModal
        visible={isIssueReportingVisible}
        onClose={closeIssueReportingModal}
      />

      {/* Header */}
      <PureFlowLogo onSettingsPress={openSettingsModal} />

      <GlobalWrapper style={{ flex: 1 }}>
        {/* Weather Summary Section */}
        <View>
          <WeatherBanner showCurrentWeather={true} city="Bogo City" />
        </View>

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
    </>
  );
}
