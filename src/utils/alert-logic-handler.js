import { getWaterQualityThresholds } from "@constants/thresholds";
import { formatSensorData } from "./format-sensor-data";

/**
 * Maps parameter codes to human-readable display names
 * @constant {Object}
 */
const parameterNames = {
  pH: "pH",
  temperature: "Temperature",
  turbidity: "Turbidity",
  salinity: "Salinity",
};

// Alert type constants for better maintainability
const ALERT_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  NORMAL: 'normal'
};

// Threshold multipliers for warning zones
const WARNING_ZONE_MULTIPLIER = 0.05; // 5% of range
const DROP_WARNING_THRESHOLD = 2;     // Absolute value for drop warnings

/**
 * Analyzes sensor data and generates alerts for any parameters outside safe thresholds.
 * Implements a multi-level alerting system with critical, warning, and normal states.
 * 
 * @param {Object|Array} sensorData - Raw sensor data to analyze
 * @returns {Array<Object>} Array of alert objects containing:
 *   - parameter: The sensor parameter name
 *   - type: Alert type (error/warning/info/normal)
 *   - title: Short alert title
 *   - message: Detailed alert message
 *   - value: Current parameter value
 *   - threshold: Threshold configuration
 */
export function getAlertsFromSensorData(sensorData) {
  // Convert and validate input data
  const formattedData = formatSensorData(sensorData);
  if (!Array.isArray(formattedData) || formattedData.length === 0) {
    console.warn('No valid sensor data provided');
    return [];
  }

  // Load threshold configurations
  const thresholds = getWaterQualityThresholds();
  if (!thresholds || typeof thresholds !== "object") {
    console.error('Invalid or missing threshold configuration');
    return [];
  }

  // Get the most recent reading (last entry in the array)
  const latest = formattedData.at(-1);
  if (!latest || typeof latest !== "object") {
    console.warn('Invalid latest reading format');
    return [];
  }

  const alerts = [];
  const alertedParameters = new Set(); // Track parameters that already have alerts
  
  /**
   * Process each parameter to check for threshold violations
   * 
   * The priority order for alerts is:
   * 1. Critical alerts (outside min/max)
   * 2. Warning alerts (approaching limits)
   * 3. Normal status
   */
  Object.entries(thresholds).forEach(([parameter, t]) => {
    // Skip invalid threshold configurations
    if (!t || typeof t !== "object") {
      console.warn(`Invalid threshold configuration for parameter: ${parameter}`);
      return;
    }
    
    // Extract and validate the parameter value
    const value = Number(latest[parameter]);
    if (isNaN(value)) {
      console.warn(`Invalid value for parameter ${parameter}: ${latest[parameter]}`);
      return;
    }

    // Calculate warning zone boundaries (5% of the threshold range)
    const range = t.max - t.min;
    const nearZone = range * WARNING_ZONE_MULTIPLIER;

    // Check for critical low value (below absolute minimum)
    if (t.min !== undefined && value < t.min) {
      addAlert(ALERT_TYPES.ERROR, parameter, value, t, 'Low', 'is too low!');
    } 
    // Check for critical high value (above absolute maximum)
    else if (t.max !== undefined && value > t.max) {
      addAlert(ALERT_TYPES.ERROR, parameter, value, t, 'High', 'is above maximum safe level!');
    } 
    // Check for warning near minimum threshold (within 5% of min)
    else if (t.min !== undefined && value < t.min + nearZone) {
      if (!alertedParameters.has(parameter)) {
        addAlert(ALERT_TYPES.WARNING, parameter, value, t, 'Low Warning', 
                'is approaching minimum threshold.');
      }
    } 
    // Check for warning near maximum threshold (within 5% of max)
    else if (t.max !== undefined && value > t.max - nearZone) {
      if (!alertedParameters.has(parameter)) {
        addAlert(ALERT_TYPES.WARNING, parameter, value, t, 'High Warning', 
                'is approaching maximum threshold.');
      }
    } 
    // Check for rapidly dropping value (within 2 units of min)
    else if (t.min !== undefined && value < t.min + DROP_WARNING_THRESHOLD) {
      addAlert(ALERT_TYPES.WARNING, parameter, value, t, 'Dropping', 
              'is close to minimum safe value.');
    }
    // Check for rapidly rising value (within 2 units of max)
    else if (t.max !== undefined && value > t.max - DROP_WARNING_THRESHOLD) {
      addAlert(ALERT_TYPES.WARNING, parameter, value, t, 'Rising', 
              'is close to maximum safe value.');
    }
    // No alerts needed - parameter is in normal range
    else if (!alertedParameters.has(parameter)) {
      addAlert(ALERT_TYPES.NORMAL, parameter, value, t, 'Normal', 
              'is within normal range.');
    }
  });

  /**
   * Helper function to create and add alert objects
   * @private
   */
  function addAlert(type, parameter, value, threshold, titleSuffix, messageSuffix) {
    const displayName = parameterNames[parameter] || parameter;
    const alert = {
      parameter,
      type,
      title: `${displayName} ${titleSuffix}`.trim(),
      message: `${displayName} ${messageSuffix}`.trim(),
      value,
      threshold,
      timestamp: new Date().toISOString()
    };
    
    alerts.push(alert);
    if (type !== ALERT_TYPES.NORMAL) {
      alertedParameters.add(parameter);
    }
  }

  // Add special condition alerts (like rain)
  if (latest.isRaining === true) {
    alerts.push({
      parameter: "rain",
      type: ALERT_TYPES.INFO,
      title: "Rain Detected",
      message: "It is currently raining. Please take necessary precautions.",
      value: true,
      threshold: null,
      timestamp: new Date().toISOString()
    });
  }

  return alerts;
}
