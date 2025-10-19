import AsyncStorage from "@react-native-async-storage/async-storage";
import WaterQualityDataTransformer from "@utils/WaterQualityDataTransformer";

/**
 * ForecastService - Handles water quality prediction and data management
 * Separates backend logic from UI components for better maintainability
 */
class ForecastService {
  constructor() {
    this.MODEL_API_URL = "https://pureflow-lite.onrender.com/api/water_quality_prediction";
    this.historicalDataKey = "waterQualityHistory";
    this.maxHistorySize = 48; // Keep last 48 readings (2 days at 1-hour intervals)
  }

  /**
   * Loads historical sensor data from AsyncStorage
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async loadHistoricalData() {
    try {
      const stored = await AsyncStorage.getItem(this.historicalDataKey);
      if (stored) {
        const parsedData = JSON.parse(stored);
        if (Array.isArray(parsedData)) {
          return { success: true, data: parsedData };
        } else {
          console.warn("Invalid historical data format, resetting to empty array");
          return { success: false, data: [] };
        }
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error("Error loading historical data:", error);
      return { success: false, data: [], error };
    }
  }

  /**
   * Saves sensor reading to historical data storage
   * @param {Object} data - Sensor data to save
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async saveToHistory(data) {
    try {
      const { success, data: currentHistory } = await this.loadHistoricalData();
      if (!success) {
        console.warn("Failed to load current history for saving");
        return { success: false, data: [] };
      }

      const updated = [data, ...currentHistory.slice(0, this.maxHistorySize - 1)];
      await AsyncStorage.setItem(this.historicalDataKey, JSON.stringify(updated));
      return { success: true, data: updated };
    } catch (error) {
      console.error("Error saving to history:", error);
      return { success: false, data: [], error };
    }
  }

  /**
   * Generates mock sensor data for testing/development
   * @returns {Object} Mock sensor data
   */
  getCurrentSensorData() {
    return {
      datetime: new Date().toISOString(),
      pH: 7.2 + (Math.random() - 0.5) * 0.5,
      temperature: 25.5 + (Math.random() - 0.5) * 2,
      salinity: 35.1 + (Math.random() - 0.5) * 1,
      turbidity: 12.5 + (Math.random() - 0.5) * 5,
      isRaining: Math.random() > 0.8 ? Math.floor(Math.random() * 4) : 0,
    };
  }

  /**
   * Validates sensor data before processing
   * @param {Object} sensorData - Sensor data to validate
   * @returns {boolean} Whether data is valid
   */
  validateSensorData(sensorData) {
    if (!sensorData) return false;
    
    const { pH, temperature, salinity, turbidity } = sensorData;
    
    // Basic range validation
    if (pH < 0 || pH > 14) return false;
    if (temperature < -10 || temperature > 50) return false;
    if (salinity < 0 || salinity > 50) return false;
    if (turbidity < 0 || turbidity > 1000) return false;
    
    return true;
  }

  /**
   * Transforms sensor data to model input format
   * @param {Object} sensorData - Current sensor data
   * @param {Array} historicalData - Historical sensor data
   * @returns {Object} Transformed data for model input
   */
  transformDataForModel(sensorData, historicalData) {
    try {
      const transformedData = WaterQualityDataTransformer.transformToModelFormat(
        sensorData,
        historicalData
      );

      return {
        inputs: [
          {
            month_sin: transformedData.month_sin || 0.0,
            month_cos: transformedData.month_cos || -1.0,
            hour_sin: transformedData.hour_sin || 0.0,
            hour_cos: transformedData.hour_cos || -1.0,
            season: transformedData.season || 1,
            rain_binary: transformedData.rain_binary || 0,
            rain_intensity: transformedData.rain_intensity || 0,
            rain_last_6h: transformedData.rain_last_6h || 0,
            rain_last_24h: transformedData.rain_last_24h || 0,
            pH_lag1: transformedData.pH_lag1 || sensorData.pH || 7.0,
            temperature_lag1: transformedData.temperature_lag1 || sensorData.temperature || 25.0,
            salinity_lag1: transformedData.salinity_lag1 || sensorData.salinity || 35.0,
            turbidity_lag1: transformedData.turbidity_lag1 || sensorData.turbidity || 10.0,
            pH_lag24: transformedData.pH_lag24 || sensorData.pH || 7.0,
            temperature_lag24: transformedData.temperature_lag24 || sensorData.temperature || 25.0,
            salinity_lag24: transformedData.salinity_lag24 || sensorData.salinity || 35.0,
            turbidity_lag24: transformedData.turbidity_lag24 || sensorData.turbidity || 10.0,
          },
        ],
      };
    } catch (error) {
      console.error("Error transforming data for model:", error);
      throw new Error("Data transformation failed");
    }
  }

  /**
   * Makes prediction request to the water quality model API
   * @param {Object} modelInput - Transformed data for model
   * @returns {Promise<Object>} Prediction result
   */
  async makePredictionRequest(modelInput) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.log("📤 Sending to model:", modelInput);

      const response = await fetch(this.MODEL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modelInput),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Prediction service unavailable (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log("📥 Model response:", result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Processes prediction response and formats it for the application
   * @param {Object} apiResponse - Raw API response
   * @returns {Object} Formatted prediction data
   */
  processPredictionResponse(apiResponse) {
    if (apiResponse.status === "success" && apiResponse.data?.predictions) {
      const prediction = apiResponse.data.predictions[0];
      return {
        pH: prediction.pH,
        Temperature: prediction.temperature,
        Salinity: prediction.salinity,
        Turbidity: prediction.turbidity,
      };
    } else if (apiResponse.status === "error") {
      throw new Error(apiResponse.message || "Prediction service returned error");
    } else {
      throw new Error("Prediction service returned invalid response");
    }
  }

  /**
   * Gets default prediction values as fallback
   * @returns {Object} Default prediction values
   */
  getDefaultPredictions() {
    return {
      pH: 7.0,
      Temperature: 25.0,
      Salinity: 35.0,
      Turbidity: 10.0,
    };
  }

  /**
   * Main prediction workflow - orchestrates the entire prediction process
   * @param {Array} historicalData - Historical sensor data
   * @returns {Promise<{success: boolean, data: Object, error?: string}>}
   */
  async makePrediction(historicalData = []) {
    try {
      // Get current sensor data
      const sensorData = this.getCurrentSensorData();

      // Validate sensor data
      if (!this.validateSensorData(sensorData)) {
        throw new Error("Invalid sensor data - values out of acceptable ranges");
      }

      console.log("🔄 Transforming data...");
      const modelInput = this.transformDataForModel(sensorData, historicalData);

      // Make API request
      const apiResponse = await this.makePredictionRequest(modelInput);

      // Process response
      const prediction = this.processPredictionResponse(apiResponse);

      // Save to history
      await this.saveToHistory(sensorData);

      console.log("✅ Prediction completed successfully!");
      return { success: true, data: prediction, sensorData };
    } catch (error) {
      console.error("❌ Prediction error:", error);
      
      // Provide detailed error information
      let errorMessage = error.message;
      if (error.name === "AbortError") {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection.";
      }

      return { 
        success: false, 
        error: errorMessage,
        fallbackData: this.getDefaultPredictions()
      };
    }
  }

  /**
   * Sets up automated prediction refresh interval
   * @param {Function} predictionCallback - Callback function to execute predictions
   * @param {number} intervalHours - Hours between predictions (default: 12)
   * @returns {Function} Cleanup function to clear the interval
   */
  setupAutomatedRefresh(predictionCallback, intervalHours = 12) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const predictionInterval = setInterval(async () => {
      console.log("🔄 Automated prediction refresh triggered");
      try {
        await predictionCallback();
      } catch (error) {
        console.error("Error in automated prediction:", error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(predictionInterval);
      console.log("🧹 Prediction refresh interval cleared");
    };
  }
}

// Export singleton instance
export default new ForecastService();
