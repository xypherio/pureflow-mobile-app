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
  const [trends, setTrends] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [lastSuccessfulPrediction, setLastSuccessfulPrediction] = useState(null);
  const [hasEverFetchedOnce, setHasEverFetchedOnce] = useState(false);
  const [forecastDataAvailable, setForecastDataAvailable] = useState(false);

  const [dataSource, setDataSource] = useState(null); // 'api' | 'firebase' | 'cached' | null

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
   * Calculates trends by comparing current forecast to previous forecast
   * @param {Object} currentForecast - Current forecast data
   * @param {Object} previousForecast - Previous forecast data to compare against
   */
  const calculateTrends = (currentForecast, previousForecast) => {
    if (!previousForecast) return {};
    
    const trendResults = {};
    Object.keys(currentForecast).forEach(param => {
      const currentValue = parseFloat(currentForecast[param]) || 0;
      const previousValue = parseFloat(previousForecast[param]) || 0;
      
      if (currentValue > previousValue) {
        trendResults[param] = 'rising';
      } else if (currentValue < previousValue) {
        trendResults[param] = 'falling';
      } else {
        trendResults[param] = 'stable';
      }
    });
    return trendResults;
  };

  /**
   * Executes prediction workflow using the ForecastService
   */
  const makePrediction = useCallback(async () => {
    try {
      setIsLoading(true);
      setPredictionError(null);

      // Fetch previous forecast for trend comparison
      const { getMostRecentForecast } = await import("@services/firebase/firestore");
      const previousForecastDoc = await getMostRecentForecast();
      const previousForecast = previousForecastDoc ? (({ timestamp, type, version, id, ...forecast }) => forecast)(previousForecastDoc) : null;

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
        setDataSource('api'); // Mark data as coming from fresh API call

        // Calculate trends by comparing to previous forecast
        const newTrends = calculateTrends(result.data, previousForecast);
        setTrends(newTrends);

        // Save current forecast to Firebase for future comparisons
        try {
          const { addForecastToFirestore } = await import("@services/firebase/firestore");
          await addForecastToFirestore(result.data);
          console.log("📤 Forecast data saved to Firebase");
        } catch (saveError) {
          console.warn("⚠️ Failed to save forecast to Firebase:", saveError);
        }

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

      // Fallback logic: try Firebase first, then default predictions as last resort
      if (lastSuccessfulPrediction) {
        console.log("🔄 Using last successful prediction as fallback");
        setForecastPredicted(lastSuccessfulPrediction);
        setForecastDataAvailable(true); // Fallback data is available
      } else {
        // Try to load from Firebase instead of using default values
        console.log("🔄 Attempting to load real forecast data from Firebase instead of defaults");

        try {
          const firebaseSuccess = await loadFallbackForecast();
          if (firebaseSuccess) {
            console.log("✅ Successfully loaded forecast from Firebase as fallback");
            setForecastDataAvailable(true); // Real data is available
          } else {
            console.log("❌ No forecast data available in Firebase, using defaults as last resort");
            const defaultPredictions = ForecastService.getDefaultPredictions();
            setForecastPredicted(defaultPredictions);
            setLastSuccessfulPrediction(defaultPredictions);
            // Keep forecastDataAvailable as false - no real data available
          }
        } catch (firebaseError) {
          console.error("❌ Error loading from Firebase:", firebaseError);
          console.log("🔄 Using defaults as final fallback");
          const defaultPredictions = ForecastService.getDefaultPredictions();
          setForecastPredicted(defaultPredictions);
          setLastSuccessfulPrediction(defaultPredictions);
          // Keep forecastDataAvailable as false - no real data available
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [historicalData, lastSuccessfulPrediction, loadHistoricalData]);

  /**
   * Sets up automated prediction refresh interval (every 4 hours)
   * @returns {Function} Cleanup function to clear intervals
   */
  const setupAutomatedPredictionRefresh = useCallback(() => {
    // Set up automated prediction refresh every 4 hours
    return ForecastService.setupAutomatedRefresh(makePrediction, 4);
  }, [makePrediction]);

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
   * Load forecast data from Firebase as fallback when API fails
   */
  const loadFallbackForecast = useCallback(async () => {
    try {
      console.log("🔄 Loading fallback forecast data from Firebase");
      const { getMostRecentForecast } = await import("@services/firebase/firestore");

      const fallbackData = await getMostRecentForecast();

      if (fallbackData) {
        // Filter out Firebase metadata before setting in state
        const { timestamp, type, version, id, ...forecastOnly } = fallbackData;
        setForecastPredicted(forecastOnly);
        setDataSource('firebase'); // Mark as coming from Firebase
        setForecastDataAvailable(true);

        console.log("✅ Successfully loaded fallback forecast from Firebase");
        return true;
      } else {
        console.log("ℹ️ No fallback forecast data available in Firebase");
        return false;
      }
    } catch (error) {
      console.error("❌ Error loading fallback forecast:", error);
      return false;
    }
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
      dataSource,
    };
  }, [forecastPredicted, isLoading, predictionError, historicalData.length, lastSuccessfulPrediction, dataSource]);

  return {
    // State
    forecastPredicted,
    trends,
    isLoading,
    predictionError,
    currentData,
    historicalData,
    lastSuccessfulPrediction,
    hasEverFetchedOnce,
    forecastDataAvailable,
    dataSource,

    // Methods
    initializePrediction: setupAutomatedPredictionRefresh,
    makePrediction: triggerPrediction, // Alias for backward compatibility
    loadHistoricalData,
    loadFallbackForecast,
    clearError,
    getPredictionStatus,
  };
};

export default useForecastService;
