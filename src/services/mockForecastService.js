import { performanceMonitor } from '@utils/performance-monitor';
import { ForecastProcessor } from './processing/ForecastProcessor';

// Initialize forecast processor with default models
const forecastProcessor = new ForecastProcessor();

// Register default forecast model
forecastProcessor.registerModel('default', {
  predict: async (historicalData, timeframe) => {
    // Simple linear regression model for demonstration
    const predictValue = (current, trend, volatility, hours) => {
      // Add some randomness based on volatility
      const randomFactor = 1 + (Math.random() * 2 - 1) * volatility;
      // Apply trend and random factor
      return current * (1 + trend * hours / 24) * randomFactor;
    };

    // Define parameter-specific behaviors
    const behaviors = {
      pH: { trend: -0.01, volatility: 0.05 },
      Temperature: { trend: 0.02, volatility: 0.1 },
      Turbidity: { trend: 0.03, volatility: 0.15 },
      Salinity: { trend: 0.01, volatility: 0.08 }
    };

    // Convert timeframe to hours
    const hours = parseInt(timeframe) || 6;
    
    // Get the most recent data point
    const latest = historicalData[historicalData.length - 1];
    
    // Generate predictions for each parameter
    const predictions = {};
    for (const [param, behavior] of Object.entries(behaviors)) {
      const currentValue = latest[param.toLowerCase()] || latest[param];
      predictions[param] = {
        value: predictValue(currentValue, behavior.trend, behavior.volatility, hours),
        confidence: 0.85, // 85% confidence
        trend: behavior.trend > 0 ? 'increasing' : behavior.trend < 0 ? 'decreasing' : 'stable',
        trendStrength: Math.abs(behavior.trend) * 100 // 0-100 scale
      };
    }

    return {
      timestamp: new Date(Date.now() + hours * 60 * 60 * 1000),
      predictions,
      metadata: {
        model: 'default',
        timeframe: `${hours}h`,
        generatedAt: new Date().toISOString()
      }
    };
  }
});

/**
 * Get forecast for the specified timeframe
 * @param {string} timeframe - Forecast horizon ('6h', '12h', '24h')
 * @param {Array} historicalData - Optional historical data for more accurate predictions
 * @returns {Promise<Object>} Forecast data with current, predicted values and details
 */
export async function getMockForecast(timeframe = '6h', historicalData = []) {
  return performanceMonitor.measureAsync('forecast.getMockForecast', async () => {
    try {
      // If no historical data provided, generate some mock data
      if (historicalData.length === 0) {
        const now = new Date();
        historicalData = Array.from({ length: 24 }, (_, i) => {
          const time = new Date(now);
          time.setHours(now.getHours() - (24 - i));
          return {
            datetime: time,
            ph: 11.5 + Math.sin(i / 4) * 0.5,
            temperature: 28 + Math.sin(i / 6) * 2,
            turbidity: 75 + Math.sin(i / 3) * 10,
            salinity: 34 + Math.sin(i / 5) * 1.5
          };
        });
      }

      console.log(`🌤️  Generating ${timeframe} forecast with ${historicalData.length} historical points`);
      
      // Generate forecast using the processor
      const forecast = await forecastProcessor.generateForecast(
        historicalData,
        timeframe,
        { 
          modelName: 'default',
          includeConfidence: true,
          includeTrends: true
        }
      );

      // Format the response
      const current = historicalData[historicalData.length - 1];
      const predicted = {};
      
      // Extract predicted values
      Object.entries(forecast.predictions).forEach(([param, data]) => {
        predicted[param] = data.value;
      });

      // Generate details based on predictions
      const details = {
        summary: generateForecastSummary(forecast),
        confidence: forecast.confidence || 0.8,
        generatedAt: forecast.metadata.generatedAt,
        timeframe: forecast.metadata.timeframe
      };

      return { 
        current: formatCurrentReadings(current),
        predicted: formatPredictedValues(predicted),
        details,
        rawForecast: forecast // Include raw forecast data for debugging
      };

    } catch (error) {
      console.error('❌ Error generating forecast:', error);
      throw new Error(`Failed to generate forecast: ${error.message}`);
    }
  });
}

// Helper functions for formatting
function formatCurrentReadings(data) {
  return {
    pH: parseFloat(data.ph || data.pH || 0).toFixed(2),
    Temperature: parseFloat(data.temperature || data.Temperature || 0).toFixed(1),
    Turbidity: Math.round(data.turbidity || data.Turbidity || 0),
    Salinity: parseFloat(data.salinity || data.Salinity || 0).toFixed(2)
  };
}

function formatPredictedValues(predictions) {
  return {
    pH: parseFloat(predictions.pH || predictions.ph || 0).toFixed(2),
    Temperature: parseFloat(predictions.Temperature || predictions.temperature || 0).toFixed(1),
    Turbidity: Math.round(predictions.Turbidity || predictions.turbidity || 0),
    Salinity: parseFloat(predictions.Salinity || predictions.salinity || 0).toFixed(2)
  };
}

function generateForecastSummary(forecast) {
  const trends = [];
  
  Object.entries(forecast.predictions).forEach(([param, data]) => {
    if (data.trend && data.trend !== 'stable') {
      trends.push(`${param} is ${data.trend} (${Math.round(data.confidence * 100)}% confidence)`);
    }
  });

  if (trends.length === 0) {
    return 'Water quality parameters are expected to remain stable.';
  }

  return `Expected changes: ${trends.join('; ')}.`;
}