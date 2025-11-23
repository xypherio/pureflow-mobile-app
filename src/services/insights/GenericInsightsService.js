/**
 * Generic Insights Service
 *
 * Provides insights generation for various data types beyond just forecast data.
 * This decouples insights from specific components and allows for reusability.
 */

import { generateInsight } from '@services/ai/geminiAPI';

/**
 * Generate insights for any water quality data
 */
export const generateWaterQualityInsights = async (data, componentId = 'wq-insights') => {
  if (!data) {
    throw new Error('No data provided for insights generation');
  }

  // Ensure data is in the expected format
  const formattedData = {
    pH: data.pH || null,
    temperature: data.temperature || null,
    turbidity: data.turbidity || null,
    salinity: data.salinity || null,
    timestamp: data.timestamp || new Date().toISOString(),
    dataSource: data.dataSource || 'sensor'
  };

  return generateInsight(formattedData, componentId);
};

/**
 * Generate parameter-specific insights
 */
export const generateParameterInsights = async (parameter, value, sensorData, componentId = 'param-insights') => {
  if (!parameter || value === undefined || value === null) {
    throw new Error('Parameter name and value are required');
  }

  const contextData = {
    primaryParameter: parameter,
    primaryValue: value,
    sensorData: sensorData,
    analysisType: 'parameter-specific'
  };

  return generateInsight(contextData, `${componentId}-${parameter}`);
};

/**
 * Generate trend-based insights
 */
export const generateTrendInsights = async (dataPoints, timeRange = '24h', componentId = 'trend-insights') => {
  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
    throw new Error('Insufficient data points for trend analysis');
  }

  const trendData = {
    dataPoints: dataPoints.slice(-50), // Limit to last 50 points
    timeRange,
    analysisType: 'trend-analysis'
  };

  return generateInsight(trendData, componentId);
};

/**
 * Generate alert-based insights
 */
export const generateAlertInsights = async (alerts, sensorData, componentId = 'alert-insights') => {
  if (!alerts || !Array.isArray(alerts)) {
    throw new Error('Alerts array is required');
  }

  const alertData = {
    alerts: alerts.slice(-10), // Limit to last 10 alerts
    sensorData,
    analysisType: 'alert-analysis'
  };

  return generateInsight(alertData, componentId);
};

/**
 * Batch generate insights for multiple parameters
 */
export const generateBatchInsights = async (parameters, data, baseComponentId = 'batch') => {
  if (!parameters || !Array.isArray(parameters) || !data) {
    throw new Error('Parameters array and data are required');
  }

  const batchPromises = parameters.map((param, index) => {
    const paramData = {
      parameter: param,
      value: data[param],
      fullData: data,
      batchItem: index + 1,
      batchTotal: parameters.length
    };

    return generateInsight(paramData, `${baseComponentId}-${param}-${index}`)
      .catch(error => ({
        insights: {
          overallInsight: `Failed to generate insight for ${param}`,
          timestamp: new Date().toISOString(),
          source: 'error'
        },
        suggestions: []
      }));
  });

  const results = await Promise.allSettled(batchPromises);
  return results.map((result, index) => ({
    parameter: parameters[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : result.reason
  }));
};

/**
 * Prefetch insights for common scenarios
 */
export const prefetchInsights = async (scenarios) => {
  if (!scenarios || !Array.isArray(scenarios)) {
    throw new Error('Scenarios array is required');
  }

  const prefetchPromises = scenarios.map(async (scenario) => {
    const { type, data, componentId } = scenario;

    switch (type) {
      case 'water-quality':
        return generateWaterQualityInsights(data, componentId || 'prefetch-wq');
      case 'parameter':
        return generateParameterInsights(scenario.parameter, scenario.value, data, componentId || 'prefetch-param');
      case 'trend':
        return generateTrendInsights(data, scenario.timeRange, componentId || 'prefetch-trend');
      case 'alert':
        return generateAlertInsights(data, scenario.sensorData, componentId || 'prefetch-alert');
      default:
        throw new Error(`Unknown prefetch scenario type: ${type}`);
    }
  });

  const results = await Promise.allSettled(prefetchPromises);
  return results.map((result, index) => ({
    scenario: scenarios[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : result.reason
  }));
};

export default {
  generateWaterQualityInsights,
  generateParameterInsights,
  generateTrendInsights,
  generateAlertInsights,
  generateBatchInsights,
  prefetchInsights
};
