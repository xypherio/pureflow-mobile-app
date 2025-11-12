import ForecastService from "@services/core/ForecastService";
import { useCallback, useState } from "react";

/**
 * Custom hook for water quality prediction logic
 * Provides a clean interface between UI components and the ForecastService
 * Maintains the same interface as the original useWaterQualityPrediction hook
 * 
 * @returns {Object} - Prediction state and functions
 */
const useForecastService = () => {
  // Prediction-related state
  const [currentData, setCurrentData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastPredicted, setForecastPredicted] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [lastSuccessfulPrediction, setLastSuccessfulPrediction] = useState(null);
  const [hasEverFetchedOnce, setHasEverFetchedOnce] = useState(false);
  const [forecastDataAvailable, setForecastDataAvailable] = useState(false);

  /**
   * Loads historical sensor data using the ForecastService
   */
  const loadHistoricalData = useCallback(async () => {
    try {
      const result = await ForecastService.loadHistoricalData();
      if (result.success) {
        setHistoricalData(result.data);
        return true;
      } else {
        console.warn("Failed to load historical data:", result.error);
        setHistoricalData([]);
        return false;
      }
    } catch (error) {
      console.error("Error loading historical data:", error);
      setHistoricalData([]);
      return false;
    }
  }, []);

  /**
   * Executes prediction workflow using the ForecastService
   */
  const makePrediction = useCallback(async () => {
    try {
      setIsLoading(true);
      setPredictionError(null);

      // Get current sensor data and set it in state
      const sensorData = ForecastService.getCurrentSensorData();
      setCurrentData(sensorData);

      // Make prediction using the service
      const result = await ForecastService.makePrediction(historicalData);

      if (result.success) {
        // Update state with successful prediction
        setForecastPredicted(result.data);
        setLastSuccessfulPrediction(result.data);
        setHasEverFetchedOnce(true);
        setForecastDataAvailable(true);

        // Update historical data if new sensor data was saved
        if (result.sensorData) {
          await loadHistoricalData();
        }

        console.log("✅ Prediction completed successfully!");
      } else {
        // Handle prediction failure
        throw new Error(result.error || "Prediction failed");
      }
    } catch (error) {
      console.error("❌ Prediction error:", error);

      // Set error message
      setPredictionError(error.message);

      // Set data availability flag to false for better error handling
      setForecastDataAvailable(false);

      // Fallback to maintain app functionality
      if (lastSuccessfulPrediction) {
        console.log("🔄 Using last successful prediction as fallback");
        setForecastPredicted(lastSuccessfulPrediction);
        setForecastDataAvailable(true); // Fallback data is available
      } else {
        console.log("🔄 Using default values as fallback");
        const defaultPredictions = ForecastService.getDefaultPredictions();
        setForecastPredicted(defaultPredictions);
        setLastSuccessfulPrediction(defaultPredictions);
        // Keep forecastDataAvailable as false - no real data available
      }
    } finally {
      setIsLoading(false);
    }
  }, [historicalData, lastSuccessfulPrediction, loadHistoricalData]);

  /**
   * Initializes prediction system and sets up automated refresh
   * @returns {Function} Cleanup function to clear intervals
   */
  const initializePrediction = useCallback(() => {
    // Load historical data and make initial prediction
    const init = async () => {
      await loadHistoricalData();
      await makePrediction();
    };
    init();

    // Set up automated prediction refresh using the service
    const cleanup = ForecastService.setupAutomatedRefresh(makePrediction, 12);

    return cleanup;
  }, [loadHistoricalData, makePrediction]);

  /**
   * Manual prediction trigger - useful for refresh buttons
   */
  const triggerPrediction = useCallback(async () => {
    await makePrediction();
  }, [makePrediction]);

  /**
   * Clear prediction error state
   */
  const clearError = useCallback(() => {
    setPredictionError(null);
  }, []);

  /**
   * Get current prediction status for debugging
   */
  const getPredictionStatus = useCallback(() => {
    return {
      hasData: !!forecastPredicted,
      isLoading,
      hasError: !!predictionError,
      errorMessage: predictionError,
      historicalDataCount: historicalData.length,
      lastSuccessful: !!lastSuccessfulPrediction,
    };
  }, [forecastPredicted, isLoading, predictionError, historicalData.length, lastSuccessfulPrediction]);

  return {
    // State
    forecastPredicted,
    isLoading,
    predictionError,
    currentData,
    historicalData,
    lastSuccessfulPrediction,
    hasEverFetchedOnce,
    forecastDataAvailable,

    // Methods
    initializePrediction,
    makePrediction: triggerPrediction, // Alias for backward compatibility
    loadHistoricalData,
    clearError,
    getPredictionStatus,
  };
};

export default useForecastService;
