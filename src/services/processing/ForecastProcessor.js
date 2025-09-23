export class ForecastProcessor {
    constructor() {
      this.models = new Map();
      this.defaultTimeframes = ['6h', '12h', '24h'];
      this.parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    }
  
    // Register forecast models
    registerModel(name, model) {
      if (typeof model.predict !== 'function') {
        throw new Error('Model must implement predict method');
      }
      this.models.set(name, model);
    }
  
    // Generate forecasts for all parameters
    async generateForecast(historicalData, timeframe = '6h', options = {}) {
      const {
        modelName = 'default',
        includeConfidence = true,
        includeTrends = true
      } = options;
  
      console.log(`🔮 Generating forecast for ${timeframe} timeframe`);
  
      const results = {
        timeframe,
        timestamp: new Date().toISOString(),
        predictions: {},
        metadata: {
          dataPoints: historicalData.length,
          model: modelName,
          confidence: includeConfidence,
          trends: includeTrends
        }
      };
  
      try {
        // Validate input data
        const validation = this.validateHistoricalData(historicalData);
        if (!validation.valid) {
          throw new Error(`Invalid historical data: ${validation.errors.join(', ')}`);
        }
  
        // Get the forecasting model
        const model = this.models.get(modelName) || this.getDefaultModel();
  
        // Generate predictions for each parameter
        for (const parameter of this.parameters) {
          try {
            const parameterData = this.extractParameterData(historicalData, parameter);
            
            if (parameterData.length === 0) {
              console.warn(`⚠️ No data available for parameter: ${parameter}`);
              continue;
            }
  
            const prediction = await model.predict(parameterData, timeframe, {
              parameter,
              includeConfidence,
              includeTrends
            });
  
            results.predictions[parameter] = prediction;
            
          } catch (error) {
            console.error(`❌ Error forecasting ${parameter}:`, error);
            results.predictions[parameter] = {
              value: null,
              error: error.message,
              confidence: 0
            };
          }
        }
  
        // Generate forecast details and alerts
        results.details = this.generateForecastDetails(results.predictions, timeframe);
        results.alerts = this.generateForecastAlerts(results.predictions, timeframe);
  
        console.log(`✅ Forecast generated with ${Object.keys(results.predictions).length} predictions`);
        
      } catch (error) {
        console.error('❌ Error generating forecast:', error);
        results.error = error.message;
      }
  
      return results;
    }
  
    validateHistoricalData(data) {
      const errors = [];
  
      if (!Array.isArray(data)) {
        errors.push('Historical data must be an array');
        return { valid: false, errors };
      }
  
      if (data.length < 5) {
        errors.push('Insufficient historical data (minimum 5 data points)');
      }
  
      // Check data quality
      let validPoints = 0;
      for (const point of data) {
        if (point && point.datetime && typeof point === 'object') {
          const hasParameters = this.parameters.some(param => 
            point[param] !== null && point[param] !== undefined && !isNaN(point[param])
          );
          if (hasParameters) validPoints++;
        }
      }
  
      if (validPoints < 3) {
        errors.push('Insufficient valid data points for forecasting');
      }
  
      return {
        valid: errors.length === 0,
        errors,
        validPoints
      };
    }
  
    extractParameterData(historicalData, parameter) {
      return historicalData
        .filter(point => 
          point[parameter] !== null && 
          point[parameter] !== undefined && 
          !isNaN(point[parameter]) &&
          point.datetime
        )
        .map(point => ({
          value: parseFloat(point[parameter]),
          timestamp: new Date(point.datetime).getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    }
  
    getDefaultModel() {
      // Simple linear trend model as default
      return {
        predict: async (data, timeframe, options) => {
          if (data.length < 2) {
            return {
              value: data[0]?.value || null,
              confidence: 0.1,
              trend: 'insufficient_data'
            };
          }
  
          // Calculate linear trend
          const n = data.length;
          const sumX = data.reduce((sum, point, i) => sum + i, 0);
          const sumY = data.reduce((sum, point) => sum + point.value, 0);
          const sumXY = data.reduce((sum, point, i) => sum + (i * point.value), 0);
          const sumXX = data.reduce((sum, point, i) => sum + (i * i), 0);
  
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
  
          // Project forward based on timeframe
          const hoursAhead = this.parseTimeframe(timeframe);
          const stepsAhead = Math.max(1, Math.round(hoursAhead / 2)); // Assuming 2-hour intervals
          
          const predictedValue = intercept + slope * (n + stepsAhead - 1);
  
          // Calculate confidence based on data consistency
          const residuals = data.map((point, i) => Math.abs(point.value - (intercept + slope * i)));
          const avgResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
          const confidence = Math.max(0.1, Math.min(0.9, 1 - (avgResidual / Math.abs(sumY / n))));
  
          // Determine trend
          let trend = 'stable';
          if (Math.abs(slope) > 0.01) {
            trend = slope > 0 ? 'increasing' : 'decreasing';
          }
  
          return {
            value: Math.round(predictedValue * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            trend,
            slope: Math.round(slope * 10000) / 10000,
            metadata: {
              dataPoints: n,
              avgResidual: Math.round(avgResidual * 100) / 100,
              timeframe,
              stepsAhead
            }
          };
        }
      };
    }
  
    parseTimeframe(timeframe) {
      const match = timeframe.match(/(\d+)([hd])/);
      if (!match) return 6; // Default 6 hours
  
      const [, amount, unit] = match;
      const hours = unit === 'h' ? parseInt(amount) : parseInt(amount) * 24;
      return hours;
    }
  
    generateForecastDetails(predictions, timeframe) {
      const details = {};
  
      for (const [parameter, prediction] of Object.entries(predictions)) {
        if (prediction.error) {
          details[parameter] = {
            available: false,
            error: prediction.error
          };
          continue;
        }
  
        details[parameter] = {
          available: true,
          predicted: prediction.value,
          confidence: prediction.confidence,
          trend: prediction.trend,
          timeframe,
          interpretation: this.interpretPrediction(parameter, prediction),
          recommendations: this.getRecommendations(parameter, prediction)
        };
      }
  
      return details;
    }
  
    interpretPrediction(parameter, prediction) {
      const { value, trend, confidence } = prediction;
      
      let interpretation = `${parameter} is predicted to be ${value}`;
      
      if (trend !== 'stable') {
        interpretation += ` with a ${trend} trend`;
      }
      
      if (confidence < 0.5) {
        interpretation += ' (low confidence)';
      } else if (confidence > 0.8) {
        interpretation += ' (high confidence)';
      }
  
      return interpretation;
    }
  
    getRecommendations(parameter, prediction) {
      const recommendations = [];
      const { value, trend, confidence } = prediction;
  
      if (confidence < 0.5) {
        recommendations.push('Monitor closely due to uncertain prediction');
      }
  
      if (trend === 'increasing') {
        const parameterAdvice = {
          pH: 'Consider acidification if trending too high',
          temperature: 'Increase cooling or reduce heat sources',
          turbidity: 'Prepare filtration systems',
          salinity: 'Check dilution systems'
        };
        recommendations.push(parameterAdvice[parameter] || 'Monitor increasing trend');
      } else if (trend === 'decreasing') {
        const parameterAdvice = {
          pH: 'Consider alkalization if trending too low',
          temperature: 'Check heating systems',
          turbidity: 'Good trend, maintain current conditions',
          salinity: 'Monitor for excessive dilution'
        };
        recommendations.push(parameterAdvice[parameter] || 'Monitor decreasing trend');
      }
  
      return recommendations;
    }
  
    generateForecastAlerts(predictions, timeframe) {
      const alerts = [];
  
      for (const [parameter, prediction] of Object.entries(predictions)) {
        if (prediction.error || !prediction.value) continue;
  
        // Check if prediction breaches thresholds
        const breach = this.evaluateBreach(parameter, prediction.value);
        
        if (breach.breach) {
          alerts.push({
            parameter,
            type: 'forecast_breach',
            severity: 'warning',
            message: `${parameter} predicted to breach safe limits (${prediction.value}) within ${timeframe}`,
            prediction: prediction.value,
            threshold: breach.threshold,
            timeframe,
            confidence: prediction.confidence
          });
        } else if (prediction.confidence < 0.3) {
          alerts.push({
            parameter,
            type: 'low_confidence',
            severity: 'info',
            message: `Low confidence forecast for ${parameter} (${Math.round(prediction.confidence * 100)}%)`,
            prediction: prediction.value,
            confidence: prediction.confidence
          });
        }
      }
  
      return alerts;
    }
  
    evaluateBreach(parameter, value) {
      const thresholds = {
        pH: { min: 6.5, max: 8.5 },
        temperature: { min: 26, max: 30 },
        turbidity: { max: 50 },
        salinity: { max: 5 }
      };
  
      const threshold = thresholds[parameter];
      if (!threshold) return { breach: false };
  
      const breach = (threshold.min && value < threshold.min) || 
                    (threshold.max && value > threshold.max);
  
      return {
        breach,
        threshold,
        breachType: threshold.min && value < threshold.min ? 'below_min' : 
                    threshold.max && value > threshold.max ? 'above_max' : null
      };
    }
  }
  
  