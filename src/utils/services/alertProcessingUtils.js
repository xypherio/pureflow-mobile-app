// Alert Processing Utilities
// Utilities for processing, filtering, and managing historical alerts

import {
  HISTORICAL_ALERTS_CONFIG,
  NOTIFICATION_SERVICE_CONFIG,
  SERVICE_LOGGING_CONFIG
} from '../../constants/services.js';

/**
 * Logs alert processing operations
 * @param {string} operation - Operation name
 * @param {...any} args - Additional log arguments
 */
function logAlertProcessing(operation, ...args) {
  if (!SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) return;

  if (SERVICE_LOGGING_CONFIG.CURRENT_LEVEL >= SERVICE_LOGGING_CONFIG.LOG_LEVELS.DEBUG) {
    console.log(`[AlertProcessing:${operation}]`, ...args);
  }
}

/**
 * Filters alerts by multiple criteria
 * @param {Array} alerts - Array of alert objects
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.type] - Alert type filter
 * @param {string} [filters.severity] - Alert severity filter
 * @param {string} [filters.parameter] - Parameter filter
 * @returns {Array} Filtered alerts
 */
export function filterAlerts(alerts, filters = {}) {
  if (!Array.isArray(alerts)) {
    logAlertProcessing('filter.error', 'Invalid alerts array provided');
    return [];
  }

  let filtered = [...alerts];
  const { type, severity, parameter } = filters;

  // Apply type filter
  if (type && type !== 'all') {
    filtered = filtered.filter(alert =>
      alert.type && alert.type.toLowerCase() === type.toLowerCase()
    );
    logAlertProcessing('filter.type', `Applied type filter '${type}': ${alerts.length} -> ${filtered.length}`);
  }

  // Apply severity filter
  if (severity && severity !== 'all') {
    filtered = filtered.filter(alert =>
      alert.severity && alert.severity.toLowerCase() === severity.toLowerCase()
    );
    logAlertProcessing('filter.severity', `Applied severity filter '${severity}': ${alerts.length} -> ${filtered.length}`);
  }

  // Apply parameter filter
  if (parameter && parameter !== 'all') {
    filtered = filtered.filter(alert =>
      alert.parameter && alert.parameter.toLowerCase() === parameter.toLowerCase()
    );
    logAlertProcessing('filter.parameter', `Applied parameter filter '${parameter}': ${alerts.length} -> ${filtered.length}`);
  }

  return filtered;
}

/**
 * Removes duplicate alerts using signature-based deduplication
 * @param {Array} alerts - Array of alert objects
 * @returns {Array} Deduplicated alerts
 */
export function removeDuplicateAlerts(alerts) {
  if (!Array.isArray(alerts)) return [];

  const uniqueAlerts = [];
  const seenSignatures = new Set();

  for (const alert of alerts) {
    const signature = createAlertSignature(alert);
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueAlerts.push(alert);
    }
  }

  const removedCount = alerts.length - uniqueAlerts.length;
  if (removedCount > 0) {
    logAlertProcessing('deduplicate', `Removed ${removedCount} duplicate alerts`);
  }

  return uniqueAlerts;
}

/**
 * Creates a deduplication signature for an alert
 * @param {Object} alert - Alert object
 * @returns {string} Deduplication signature
 */
export function createAlertSignature(alert) {
  if (!alert) return '';

  const parameter = (alert.parameter || 'unknown').toLowerCase();
  const type = (alert.type || 'unknown').toLowerCase();
  const title = (alert.title || '').toLowerCase().trim();
  const value = alert.value !== undefined ?
    Math.round((parseFloat(alert.value) || 0) * 100) / 100 : 0;

  return `${parameter}-${type}-${title}-${value}`;
}

/**
 * Processes raw alerts into display-ready format
 * @param {Array} alerts - Raw alert data
 * @returns {Array} Processed alerts for UI display
 */
export function processAlertsForDisplay(alerts) {
  if (!Array.isArray(alerts)) return [];

  return alerts.map(alert => processSingleAlertForDisplay(alert));
}

/**
 * Processes a single alert for display
 * @param {Object} alert - Raw alert data
 * @returns {Object} Processed alert for display
 */
export function processSingleAlertForDisplay(alert) {
  return {
    id: alert.id || 'unknown',
    type: alert.type || 'info',
    title: alert.title || 'Unknown Alert',
    message: alert.message || alert.title || 'No message available',
    parameter: alert.parameter || 'Unknown',
    severity: alert.severity || 'low',
    value: alert.value,
    threshold: alert.threshold,
    occurrenceCount: alert.occurrenceCount || 1,
    // Note: timestamp processing moved to dateTimeUtils
    // dataAge will be added by the grouping function
  };
}

/**
 * Generates statistics about alert data
 * @param {Array} alerts - Array of alert objects
 * @returns {Object} Alert statistics
 */
export function generateAlertStatistics(alerts) {
  if (!Array.isArray(alerts)) {
    return createEmptyStatistics();
  }

  const stats = {
    total: alerts.length,
    byType: {},
    bySeverity: {},
    byParameter: {},
    recent: 0
  };

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  alerts.forEach(alert => {
    // Count by type
    const type = alert.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Count by severity
    const severity = alert.severity || 'unknown';
    stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

    // Count by parameter
    const parameter = alert.parameter || 'unknown';
    stats.byParameter[parameter] = (stats.byParameter[parameter] || 0) + 1;

    // Count recent alerts (last 24 hours)
    if (alert.timestamp?.date) {
      if (alert.timestamp.date >= twentyFourHoursAgo) {
        stats.recent++;
      }
    } else if (alert.createdAt) {
      const createdAt = new Date(alert.createdAt);
      if (createdAt >= twentyFourHoursAgo) {
        stats.recent++;
      }
    }
  });

  logAlertProcessing('statistics', `Generated stats for ${alerts.length} alerts`);
  return stats;
}

/**
 * Creates empty statistics object
 * @returns {Object} Empty statistics structure
 */
function createEmptyStatistics() {
  return {
    total: 0,
    byType: {},
    bySeverity: {},
    byParameter: {},
    recent: 0
  };
}

/**
 * Validates alert data structure
 * @param {Object} alert - Alert object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateAlertData(alert) {
  const errors = [];

  if (!alert) {
    errors.push('Alert object is null or undefined');
    return { isValid: false, errors };
  }

  if (!alert.id || typeof alert.id !== 'string') {
    errors.push('Alert must have a valid string id');
  }

  if (!alert.title || typeof alert.title !== 'string') {
    errors.push('Alert must have a valid string title');
  }

  if (!alert.parameter || typeof alert.parameter !== 'string') {
    errors.push('Alert must have a valid string parameter');
  }

  // Optional fields validation
  if (alert.severity && !['low', 'medium', 'high', 'critical'].includes(alert.severity)) {
    errors.push('Alert severity must be one of: low, medium, high, critical');
  }

  if (alert.type && !['warning', 'alert', 'info', 'error'].includes(alert.type)) {
    errors.push('Alert type must be one of: warning, alert, info, error');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Merges alert updates into existing alert list
 * @param {Array} existingAlerts - Current alerts
 * @param {Array} newAlerts - New alerts to merge
 * @param {string} mergeStrategy - 'append', 'replace', or 'deduplicate'
 * @returns {Array} Merged alerts
 */
export function mergeAlertUpdates(existingAlerts, newAlerts, mergeStrategy = 'append') {
  if (!Array.isArray(existingAlerts)) existingAlerts = [];
  if (!Array.isArray(newAlerts)) newAlerts = [];

  logAlertProcessing('merge', `Merging ${existingAlerts.length} existing with ${newAlerts.length} new alerts using ${mergeStrategy} strategy`);

  switch (mergeStrategy) {
    case 'replace':
      return [...newAlerts];

    case 'deduplicate':
      const combined = [...existingAlerts, ...newAlerts];
      return removeDuplicateAlerts(combined);

    case 'append':
    default:
      return [...existingAlerts, ...newAlerts];
  }
}

/**
 * Sorts alerts by timestamp (newest first)
 * @param {Array} alerts - Array of alert objects
 * @returns {Array} Sorted alerts
 */
export function sortAlertsByTimestamp(alerts) {
  if (!Array.isArray(alerts)) return [];

  return alerts.sort((a, b) => {
    const timeA = a.timestamp?.date?.getTime() || new Date(a.createdAt || 0).getTime();
    const timeB = b.timestamp?.date?.getTime() || new Date(b.createdAt || 0).getTime();
    return timeB - timeA; // Newest first
  });
}

/**
 * Limits the number of alerts returned
 * @param {Array} alerts - Array of alerts
 * @param {number} limit - Maximum number of alerts
 * @returns {Array} Limited alerts array
 */
export function limitAlerts(alerts, limit = HISTORICAL_ALERTS_CONFIG.DEFAULT_LIMIT_COUNT) {
  if (!Array.isArray(alerts)) return [];

  if (alerts.length > limit) {
    logAlertProcessing('limit', `Limiting alerts from ${alerts.length} to ${limit}`);
    return alerts.slice(0, limit);
  }

  return alerts;
}

/**
 * Creates alert processing result object
 * @param {boolean} success - Whether processing was successful
 * @param {Array} alerts - Processed alerts
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized result object
 */
export function createAlertProcessingResult(success, alerts = [], metadata = {}) {
  return {
    success,
    sections: alerts,
    totalCount: alerts.reduce((sum, section) => sum + (section.data?.length || 0), 0),
    filteredCount: alerts.reduce((sum, section) => sum + (section.data?.length || 0), 0),
    lastUpdated: Date.now(),
    ...metadata
  };
}

/**
 * Performs comprehensive alert processing pipeline
 * @param {Array} rawAlerts - Raw alerts from data source
 * @param {Object} options - Processing options
 * @returns {Object} Complete processing result
 */
export function processAlertPipeline(rawAlerts, options = {}) {
  const {
    filters = {},
    limit = HISTORICAL_ALERTS_CONFIG.DEFAULT_LIMIT_COUNT,
    sort = true,
    deduplicate = true,
    validate = true
  } = options;

  logAlertProcessing('pipeline.start', 'Starting alert processing pipeline');

  try {
    let alerts = [...rawAlerts];

    // Step 1: Validate alerts
    if (validate) {
      alerts = alerts.filter(alert => {
        const validation = validateAlertData(alert);
        if (!validation.isValid) {
          logAlertProcessing('pipeline.validation', `Filtered invalid alert ${alert.id}: ${validation.errors.join(', ')}`);
          return false;
        }
        return true;
      });
    }

    // Step 2: Process for display format
    alerts = processAlertsForDisplay(alerts);

    // Step 3: Filter alerts
    alerts = filterAlerts(alerts, filters);

    // Step 4: Remove duplicates
    if (deduplicate) {
      alerts = removeDuplicateAlerts(alerts);
    }

    // Step 5: Sort by timestamp
    if (sort) {
      alerts = sortAlertsByTimestamp(alerts);
    }

    // Step 6: Apply limits
    alerts = limitAlerts(alerts, limit);

    logAlertProcessing('pipeline.complete', `Completed pipeline: ${alerts.length} alerts processed`);

    return createAlertProcessingResult(true, alerts, {
      pipelineSteps: ['validate', 'process', 'filter', 'deduplicate', 'sort', 'limit'],
      processingOptions: options
    });

  } catch (error) {
    logAlertProcessing('pipeline.error', 'Pipeline error:', error);
    return createAlertProcessingResult(false, [], {
      error: error.message,
      pipelineSteps: [],
      processingOptions: options
    });
  }
}
