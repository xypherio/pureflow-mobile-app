// Processing Services Utilities
// Common utility functions for processing services

import {
  PROCESSING_LOGGING_CONFIG,
  ALERT_PROCESSING_CONFIG,
  DATA_PROCESSING_CONFIG,
  NUMERIC_FIELD_RANGES,
  WATER_QUALITY_THRESHOLDS,
  PARAMETER_UNITS,
  CONFIDENCE_SCORES,
  PROCESSING_ERRORS,
  PERFORMANCE_THRESHOLDS
} from '../../constants/processing.js';
import { log as dataLog } from './dataRepositoryUtils.js';
import { recommendationEngine } from './recommendationEngine.js';

/**
 * Logs processing operations
 * @param {string} component - Component name (e.g., 'AlertProcessor')
 * @param {string} operation - Operation name
 * @param {...any} args - Additional log arguments
 */
export function logProcessing(component, operation, ...args) {
  const message = `[${component}:${operation}]`;
  dataLog(PROCESSING_LOGGING_CONFIG.CURRENT_LEVEL < PROCESSING_LOGGING_CONFIG.LOG_LEVELS.DEBUG ? 'info' : 'debug', message, ...args);
}

/**
 * Creates standardized processing result
 * @param {boolean} success - Operation success
 * @param {*} data - Operation data/result
 * @param {string} operation - Operation name
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized result object
 */
export function createProcessingResult(success, data = null, operation = '', metadata = {}) {
  const result = {
    success,
    data,
    timestamp: new Date().toISOString(),
    operation,
    ...metadata
  };

  logProcessing('Result', operation, success ? 'Success' : 'Failed', data ? 'Has data' : 'No data');
  return result;
}

/**
 * Validates data field ranges and types
 * @param {string} field - Field name
 * @param {*} value - Field value
 * @returns {Object} Validation result
 */
export function validateFieldRange(field, value) {
  const range = NUMERIC_FIELD_RANGES[field.toLowerCase()];
  if (!range) return { valid: true, message: 'Field not restricted' };

  if (value === null || value === undefined || isNaN(value)) {
    return { valid: false, message: 'Value is null, undefined, or NaN' };
  }

  const numValue = parseFloat(value);
  if (numValue < range.min || numValue > range.max) {
    return {
      valid: false,
      message: `Value ${numValue} outside range ${range.min}-${range.max}`
    };
  }

  return { valid: true, message: 'Valid' };
}

/**
 * Calculates parameter deviation from thresholds
 * @param {string} parameter - Parameter name
 * @param {number} value - Current value
 * @param {Object} thresholds - Threshold ranges
 * @returns {Object} Deviation analysis
 */
export function calculateThresholdDeviation(parameter, value, thresholds = null) {
  const paramThresholds = thresholds || WATER_QUALITY_THRESHOLDS[parameter.toLowerCase()];

  if (!paramThresholds) {
    return {
      deviation: 0,
      direction: 'unknown',
      withinRange: true,
      threshold: null
    };
  }

  if (value > paramThresholds.acceptable[1]) {
    const deviation = ((value - paramThresholds.ideal[1]) / paramThresholds.ideal[1]) * 100;
    return {
      deviation: Math.abs(deviation),
      direction: 'high',
      withinRange: value <= paramThresholds.critical[1],
      threshold: paramThresholds.ideal[1]
    };
  } else if (value < paramThresholds.acceptable[0]) {
    const deviation = ((paramThresholds.ideal[0] - value) / paramThresholds.ideal[0]) * 100;
    return {
      deviation: Math.abs(deviation),
      direction: 'low',
      withinRange: value >= paramThresholds.critical[0],
      threshold: paramThresholds.ideal[0]
    };
  }

  return {
    deviation: 0,
    direction: 'normal',
    withinRange: true,
    threshold: paramThresholds.ideal
  };
}

/**
 * Generates alert recommendations using the recommendation engine
 * @param {string} parameter - Parameter name
 * @param {number} value - Current value
 * @param {string} alertLevel - Alert severity
 * @param {Object} thresholdAnalysis - Threshold analysis result
 * @returns {Array} Recommendations array
 */
export function generateParameterRecommendations(parameter, value, alertLevel, thresholdAnalysis) {
  return recommendationEngine.generateRecommendations(
    parameter,
    alertLevel,
    thresholdAnalysis.direction,
    thresholdAnalysis.deviation,
    value
  );
}

/**
 * Creates parameter analysis result
 * @param {string} parameter - Parameter name
 * @param {number} value - Current value
 * @param {Array} historicalData - Historical data points
 * @returns {Object} Complete parameter analysis
 */
export function analyzeParameter(parameter, value, historicalData = []) {
  const thresholdAnalysis = calculateThresholdDeviation(parameter, value);
  const fieldValidation = validateFieldRange(parameter, value);

  // Determine alert level
  let alertLevel = 'normal';
  if (thresholdAnalysis.deviation > 30 || !thresholdAnalysis.withinRange) {
    alertLevel = 'critical';
  } else if (thresholdAnalysis.deviation > 15) {
    alertLevel = 'warning';
  }

  // Generate recommendations
  const recommendations = generateParameterRecommendations(parameter, value, alertLevel, thresholdAnalysis);

  return {
    parameter,
    value,
    unit: PARAMETER_UNITS[parameter]?.unit || '',
    thresholdAnalysis,
    alertLevel,
    recommendations,
    validation: fieldValidation,
    historicalCount: historicalData.length
  };
}

/**
 * Calculates confidence score for predictions/forecasts
 * @param {number} confidenceValue - Raw confidence value (0-1)
 * @returns {Object} Confidence assessment
 */
export function calculateConfidenceScore(confidenceValue) {
  if (confidenceValue >= CONFIDENCE_SCORES.VERY_HIGH.range[0]) {
    return {
      level: 'very_high',
      score: confidenceValue,
      ...CONFIDENCE_SCORES.VERY_HIGH
    };
  } else if (confidenceValue >= CONFIDENCE_SCORES.HIGH.range[0]) {
    return {
      level: 'high',
      score: confidenceValue,
      ...CONFIDENCE_SCORES.HIGH
    };
  } else if (confidenceValue >= CONFIDENCE_SCORES.MODERATE.range[0]) {
    return {
      level: 'moderate',
      score: confidenceValue,
      ...CONFIDENCE_SCORES.MODERATE
    };
  } else if (confidenceValue >= CONFIDENCE_SCORES.LOW.range[0]) {
    return {
      level: 'low',
      score: confidenceValue,
      ...CONFIDENCE_SCORES.LOW
    };
  } else {
    return {
      level: 'very_low',
      score: confidenceValue,
      ...CONFIDENCE_SCORES.VERY_LOW
    };
  }
}

/**
 * Validates processing pipeline data
 * @param {Object} data - Pipeline data to validate
 * @returns {Object} Validation result
 */
export function validateProcessingData(data) {
  if (!data) {
    return createProcessingResult(false, null, 'validation', {
      error: PROCESSING_ERRORS.VALIDATION_FAILED,
      reason: 'No data provided'
    });
  }

  const errors = [];
  const warnings = [];

  // Check required fields based on data type
  if (data.type === 'alert' && (!data.parameter || !data.alertLevel)) {
    errors.push('Alert data missing required parameter or alertLevel');
  }

  if (data.type === 'forecast' && (!data.parameter || !data.timeframe)) {
    errors.push('Forecast data missing required parameter or timeframe');
  }

  // Check timestamp validity
  if (data.timestamp) {
    try {
      const timestamp = new Date(data.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp format');
      }
    } catch (error) {
      errors.push('Timestamp parsing failed');
    }
  }

  // Check value ranges for numeric data
  if (typeof data.value === 'number') {
    const rangeCheck = data.parameter ? validateFieldRange(data.parameter, data.value) : { valid: true };
    if (!rangeCheck.valid) {
      warnings.push(rangeCheck.message);
    }
  }

  return createProcessingResult(errors.length === 0, {
    errors,
    warnings,
    data
  }, 'validation');
}

/**
 * Creates deduplication signature for alerts
 * @param {Object} alert - Alert data
 * @returns {string} Deduplication signature
 */
export function createAlertSignature(alert) {
  if (!alert.parameter || !alert.alertLevel) return '';

  const value = Math.round((alert.value || 0) * 100) / 100; // Round to 2 decimal places
  return `${alert.parameter}-${alert.alertLevel}-${value}`;
}

/**
 * Groups data by time periods for aggregation
 * @param {Array} data - Array of data points with timestamps
 * @param {string} period - Grouping period ('hour', 'day', 'week')
 * @returns {Object} Grouped data
 */
export function groupDataByTimePeriod(data, period = 'day') {
  const groups = {};

  data.forEach(item => {
    if (!item.timestamp) return;

    const date = new Date(item.timestamp);
    let key;

    switch (period) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
      default: // day
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  // Calculate aggregates for each group
  const aggregatedGroups = {};
  Object.entries(groups).forEach(([key, groupData]) => {
    aggregatedGroups[key] = aggregateDataPoints(groupData);
  });

  return aggregatedGroups;
}

/**
 * Aggregates multiple data points into summary statistics
 * @param {Array} dataPoints - Array of data points
 * @returns {Object} Aggregated statistics
 */
export function aggregateDataPoints(dataPoints) {
  if (!dataPoints || dataPoints.length === 0) {
    return { count: 0, averages: {}, min: {}, max: {} };
  }

  const parameters = ['pH', 'temperature', 'turbidity', 'salinity', 'tds'];
  const stats = {
    count: dataPoints.length,
    averages: {},
    min: {},
    max: {},
    firstTimestamp: dataPoints[0]?.timestamp,
    lastTimestamp: dataPoints[dataPoints.length - 1]?.timestamp
  };

  parameters.forEach(param => {
    const values = dataPoints
      .map(point => point[param])
      .filter(val => val !== null && val !== undefined && !isNaN(val))
      .map(val => parseFloat(val));

    if (values.length > 0) {
      stats.averages[param] = values.reduce((sum, val) => sum + val, 0) / values.length;
      stats.min[param] = Math.min(...values);
      stats.max[param] = Math.max(...values);
    }
  });

  return stats;
}

/**
 * Detects anomalies in data series using statistical methods
 * @param {Array} values - Array of numeric values
 * @param {string} method - Anomaly detection method ('zscore', 'iqr', 'moving_average')
 * @param {number} threshold - Threshold for anomaly detection
 * @returns {Array} Indices of detected anomalies
 */
export function detectAnomalies(values, method = 'zscore', threshold = 3) {
  if (!values || values.length < 3) return [];

  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (numericValues.length < 3) return [];

  const anomalies = [];

  switch (method) {
    case 'zscore':
      anomalies.push(...detectZScoreAnomalies(numericValues, threshold));
      break;
    case 'iqr':
      anomalies.push(...detectIQRAnomalies(numericValues, threshold));
      break;
    case 'moving_average':
      anomalies.push(...detectMovingAverageAnomalies(numericValues, threshold));
      break;
    default:
      console.warn(`Unknown anomaly detection method: ${method}`);
      return [];
  }

  return anomalies;
}

/**
 * Detects anomalies using Z-score method
 * @param {Array} values - Numeric values
 * @param {number} threshold - Z-score threshold
 * @returns {Array} Anomalous indices
 */
function detectZScoreAnomalies(values, threshold) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

  if (stdDev === 0) return [];

  const anomalies = [];
  values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(index);
    }
  });

  return anomalies;
}

/**
 * Detects anomalies using IQR method
 * @param {Array} values - Numeric values
 * @param {number} threshold - IQR multiplier threshold
 * @returns {Array} Anomalous indices
 */
function detectIQRAnomalies(values, threshold) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - (threshold * iqr);
  const upperBound = q3 + (threshold * iqr);

  const anomalies = [];
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      anomalies.push(index);
    }
  });

  return anomalies;
}

/**
 * Detects anomalies using moving average method
 * @param {Array} values - Numeric values
 * @param {number} threshold - Deviation threshold
 * @returns {Array} Anomalous indices
 */
function detectMovingAverageAnomalies(values, threshold) {
  if (values.length < 5) return [];

  const anomalies = [];
  const windowSize = Math.min(5, Math.floor(values.length / 3));

  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    const deviation = Math.abs((values[i] - avg) / avg) * 100;


    if (deviation > threshold) {
      anomalies.push(i);
    }
  }

  return anomalies;
}
