// Data Service Utilities (moved from services/data for broader usage)
// Logging and helper functions for data services across the application

import { SERVICE_LOGGING_CONFIG } from '../constants/services.js';

/**
 * Simple logging utility for data services
 * @param {string} level - Log level (info, warn, error)
 * @param {...any} args - Log arguments
 */
export function log(level, ...args) {
  if (!SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
    return; // Skip if detailed logging disabled
  }

  if (SERVICE_LOGGING_CONFIG.CURRENT_LEVEL > SERVICE_LOGGING_CONFIG.LOG_LEVELS[level.toUpperCase()]) {
    return; // Skip if log level is below threshold
  }

  const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm format
  const prefix = `[DataService:${timestamp}]`;

  switch (level.toLowerCase()) {
    case 'error':
      console.error(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    case 'info':
    default:
      console.log(prefix, ...args);
      break;
  }
}

/**
 * Validate data point structure
 * @param {Object} dataPoint - Data point to validate
 * @returns {boolean} Whether data point is valid
 */
export function validateDataPoint(dataPoint) {
  if (!dataPoint || typeof dataPoint !== 'object') {
    log('warn', 'Invalid data point: not an object');
    return false;
  }

  // Check for required datetime field
  if (!dataPoint.datetime || !(dataPoint.datetime instanceof Date)) {
    log('warn', 'Invalid data point: missing or invalid datetime');
    return false;
  }

  return true;
}

/**
 * Sanitize data point values
 * @param {Object} dataPoint - Data point to sanitize
 * @returns {Object} Sanitized data point
 */
export function sanitizeDataPoint(dataPoint) {
  const sanitized = { ...dataPoint };

  // Ensure datetime is a proper Date object
  if (sanitized.datetime && !(sanitized.datetime instanceof Date)) {
    try {
      sanitized.datetime = new Date(sanitized.datetime);
    } catch (error) {
      log('error', 'Failed to parse datetime:', sanitized.datetime);
      return null;
    }
  }

  // Sanitize numeric fields
  const numericFields = ['pH', 'temperature', 'turbidity', 'salinity'];
  numericFields.forEach(field => {
    if (sanitized[field] != null) {
      const numValue = parseFloat(sanitized[field]);
      if (isNaN(numValue)) {
        log('warn', `Invalid ${field} value:`, sanitized[field]);
        sanitized[field] = null;
      } else {
        sanitized[field] = numValue;
      }
    }
  });

  return sanitized;
}

/**
 * Filter data points by date range
 * @param {Array} data - Array of data points
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered data points
 */
export function filterByDateRange(data, startDate, endDate) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(point => {
    if (!validateDataPoint(point)) {
      return false;
    }

    const pointDate = point.datetime;
    return pointDate >= startDate && pointDate <= endDate;
  });
}

/**
 * Group data points by time interval
 * @param {Array} data - Array of data points
 * @param {string} interval - Time interval (hour, day, month)
 * @returns {Map} Grouped data points
 */
export function groupByTimeInterval(data, interval = 'hour') {
  const groups = new Map();

  if (!Array.isArray(data)) {
    return groups;
  }

  data.forEach(point => {
    if (!validateDataPoint(point)) {
      return;
    }

    const date = point.datetime;
    let key;

    switch (interval.toLowerCase()) {
      case 'day':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'hour':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(point);
  });

  return groups;
}

/**
 * Calculate basic statistics for numeric data
 * @param {Array} values - Array of numeric values
 * @returns {Object} Statistics
 */
export function calculateBasicStats(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      sum: 0,
      average: null
    };
  }

  const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (validValues.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      sum: 0,
      average: null
    };
  }

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const average = sum / validValues.length;

  return {
    count: validValues.length,
    min,
    max,
    sum,
    average: parseFloat(average.toFixed(2))
  };
}

/**
 * Get data quality metrics
 * @param {Array} data - Array of data points
 * @returns {Object} Quality metrics
 */
export function getDataQualityMetrics(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      completeness: 0,
      quality: 'empty'
    };
  }

  const total = data.length;
  let valid = 0;
  const fieldCounts = {};

  data.forEach(point => {
    if (validateDataPoint(point)) {
      valid++;

      // Count non-null fields
      Object.keys(point).forEach(key => {
        if (point[key] != null && point[key] !== '') {
          fieldCounts[key] = (fieldCounts[key] || 0) + 1;
        }
      });
    }
  });

  const invalid = total - valid;
  const completeness = valid / total;
  let quality = 'poor';

  if (completeness >= 0.95 && invalid === 0) {
    quality = 'excellent';
  } else if (completeness >= 0.8) {
    quality = 'good';
  } else if (completeness >= 0.6) {
    quality = 'fair';
  }

  return {
    total,
    valid,
    invalid,
    completeness: parseFloat(completeness.toFixed(3)),
    quality,
    fieldCompleteness: fieldCounts
  };
}
