
/**
 * Water Quality Data Transformer
 *
 * Transforms raw sensor data into ML model input format and validates data quality.
 * Handles lag features, rolling statistics, and time-based features for water quality prediction.
 */
class WaterQualityDataTransformer {
  /**
   * Validates sensor data structure and value ranges
   * @param {Object} data - Raw sensor data object
   * @returns {boolean} - True if all required fields exist and values are within valid ranges
   */
  static validateBasicData(data) {
    if (!data || typeof data !== 'object') {
      console.error('Invalid data: not an object');
      return false;
    }

    const requiredFields = ['datetime', 'pH', 'temperature', 'salinity', 'turbidity'];
    const optionalFields = ['isRaining'];

    // Check required fields exist
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate data types and ranges
    if (typeof data.pH !== 'number' || data.pH < 0 || data.pH > 14) {
      console.error('Invalid pH value:', data.pH);
      return false;
    }

    if (typeof data.temperature !== 'number' || data.temperature < -50 || data.temperature > 100) {
      console.error('Invalid temperature value:', data.temperature);
      return false;
    }

    if (typeof data.salinity !== 'number' || data.salinity < 0 || data.salinity > 100) {
      console.error('Invalid salinity value:', data.salinity);
      return false;
    }

    if (typeof data.turbidity !== 'number' || data.turbidity < 0) {
      console.error('Invalid turbidity value:', data.turbidity);
      return false;
    }

    // Validate optional fields if present
    if ('isRaining' in data && typeof data.isRaining !== 'number') {
      console.error('Invalid isRaining value:', data.isRaining);
      return false;
    }

    return true;
  }

  /**
   * Converts raw sensor data into ML model input format
   * @param {Object} currentData - Current sensor readings (pH, temperature, salinity, turbidity, etc.)
   * @param {Array} historicalData - Array of previous sensor readings for feature engineering
   * @returns {Object} - Complete feature set ready for ML model prediction
   */
  static transformToModelFormat(currentData, historicalData = []) {
    try {
      // Create lag features from historical data
      const lagFeatures = this.createLagFeatures(currentData, historicalData);

      // Create rolling statistics
      const rollingStats = this.createRollingStatistics(historicalData);

      // Create time-based features
      const timeFeatures = this.createTimeFeatures(currentData.datetime);

      // Combine all features
      const modelInput = {
        // Current readings
        pH: currentData.pH,
        temperature: currentData.temperature,
        salinity: currentData.salinity,
        turbidity: currentData.turbidity,
        isRaining: currentData.isRaining || 0,

        // Lag features (last 6 readings, assuming hourly data)
        ...lagFeatures,

        // Rolling statistics (last 24 hours)
        ...rollingStats,

        // Time features
        ...timeFeatures,

        // Metadata
        timestamp: currentData.datetime,
        data_points: historicalData.length
      };

      return modelInput;
    } catch (error) {
      console.error('Error transforming data:', error);
      throw new Error(`Data transformation failed: ${error.message}`);
    }
  }

  /**
   * Creates lag features from historical sensor data
   * @param {Object} currentData - Current sensor readings (unused but kept for consistency)
   * @param {Array} historicalData - Array of past sensor readings
   * @returns {Object} - Lag features (e.g., pH_lag_1, temperature_lag_2) for the last 6 time periods
   */
  static createLagFeatures(currentData, historicalData) {
    const lagFeatures = {};
    const maxLag = 6; // Last 6 readings

    // Sort historical data by datetime (most recent first)
    const sortedHistory = [...historicalData].sort((a, b) =>
      new Date(b.datetime) - new Date(a.datetime)
    );

    // Create lag features for each parameter
    const parameters = ['pH', 'temperature', 'salinity', 'turbidity'];

    for (const param of parameters) {
      for (let lag = 1; lag <= maxLag; lag++) {
        const historicalValue = sortedHistory[lag - 1]?.[param];
        lagFeatures[`${param}_lag_${lag}`] = historicalValue !== undefined ? historicalValue : null;
      }
    }

    return lagFeatures;
  }

  /**
   * Calculates rolling statistics (mean and standard deviation) from recent historical data
   * @param {Array} historicalData - Array of past sensor readings
   * @returns {Object} - 24-hour rolling averages and standard deviations for each parameter
   */
  static createRollingStatistics(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return {
        pH_mean_24h: null,
        pH_std_24h: null,
        temperature_mean_24h: null,
        temperature_std_24h: null,
        salinity_mean_24h: null,
        salinity_std_24h: null,
        turbidity_mean_24h: null,
        turbidity_std_24h: null
      };
    }

    const parameters = ['pH', 'temperature', 'salinity', 'turbidity'];
    const stats = {};

    // Use last 24 readings (assuming hourly data = 24 hours)
    const recentData = historicalData.slice(0, 24);

    for (const param of parameters) {
      const values = recentData
        .map(item => item[param])
        .filter(val => val !== null && val !== undefined);

      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);

        stats[`${param}_mean_24h`] = mean;
        stats[`${param}_std_24h`] = std;
      } else {
        stats[`${param}_mean_24h`] = null;
        stats[`${param}_std_24h`] = null;
      }
    }

    return stats;
  }

  /**
   * Extracts time-based features from datetime for ML model
   * @param {string} datetime - ISO datetime string
   * @returns {Object} - Time features including hour, day of week, month, weekend flag, and night flag
   */
  static createTimeFeatures(datetime) {
    const date = new Date(datetime);
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const month = date.getMonth(); // 0 = January, 11 = December

    return {
      hour_of_day: hour,
      day_of_week: dayOfWeek,
      month: month,
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
      is_night: hour >= 22 || hour <= 5 ? 1 : 0
    };
  }

  /**
   * Converts raw ML model predictions into standardized application format
   * @param {Object} modelOutput - Raw prediction results from ML model API
   * @returns {Object} - Standardized prediction object with success status, predictions, quality assessment, and metadata
   */
  static transformModelOutput(modelOutput) {
    try {
      // This would transform the model's raw output into a format
      // that matches what the application expects
      // The exact transformation depends on your model's output format

      return {
        success: true,
        predictions: {
          pH: modelOutput.predicted_pH || modelOutput.pH,
          temperature: modelOutput.predicted_temperature || modelOutput.temperature,
          salinity: modelOutput.predicted_salinity || modelOutput.salinity,
          turbidity: modelOutput.predicted_turbidity || modelOutput.turbidity
        },
        quality_assessment: {
          overall_quality: modelOutput.quality_assessment || 'unknown',
          alerts: modelOutput.alerts || []
        },
        confidence: modelOutput.confidence || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error transforming model output:', error);
      throw new Error(`Model output transformation failed: ${error.message}`);
    }
  }
}

export default WaterQualityDataTransformer;
