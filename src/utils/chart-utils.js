import { chartYAxisConfig } from './chart-config';
import { colors } from '../constants/colors';

/**
 * Get chart colors for parameters
 * @returns {Object} - Object with parameter colors
 */
export const getChartColors = () => ({
  pH: colors.primary || "#FF6B6B",
  temperature: colors.secondary || "#4ECDC4",
  turbidity: colors.tertiary || "#45B7D1",
  salinity: colors.quaternary || "#96CEB4"
});

/**
 * Get Y-axis minimum value for a specific parameter
 * @param {string} parameter - The parameter name (pH, temperature, turbidity, salinity)
 * @returns {number} - The minimum Y-axis value
 */
export const getYAxisMin = (parameter) => {
  return chartYAxisConfig[parameter]?.min ?? chartYAxisConfig.default.min;
};

/**
 * Get Y-axis maximum value for a specific parameter
 * @param {string} parameter - The parameter name (pH, temperature, turbidity, salinity)
 * @returns {number} - The maximum Y-axis value
 */
export const getYAxisMax = (parameter) => {
  return chartYAxisConfig[parameter]?.max ?? chartYAxisConfig.default.max;
};

/**
 * Get Y-axis interval for a specific parameter
 * @param {string} parameter - The parameter name (pH, temperature, turbidity, salinity)
 * @returns {number} - The Y-axis interval
 */
export const getYAxisInterval = (parameter) => {
  return chartYAxisConfig[parameter]?.interval || chartYAxisConfig.default.interval;
};

/**
 * Get unit for a specific parameter
 * @param {string} parameter - The parameter name (pH, temperature, turbidity, salinity)
 * @returns {string} - The unit string
 */
export const getParameterUnit = (parameter) => {
  return chartYAxisConfig[parameter]?.unit || chartYAxisConfig.default.unit;
};

/**
 * Format timestamp for chart labels
 * @param {Date} datetime - The datetime object
 * @returns {string} - Formatted time string
 */
export const formatChartTimeLabel = (datetime) => {
  if (!(datetime instanceof Date)) {
    datetime = new Date(datetime);
  }
  if (isNaN(datetime.getTime())) {
    return "";
  }
  return datetime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Validate if data has enough points for line chart
 * @param {Array} data - Array of data
 * @param {number} minPoints - Minimum points required (default: 2)
 * @returns {boolean} - Whether data has enough points
 */
export const hasEnoughDataPoints = (data, minPoints = 2) => {
  return Array.isArray(data) && data.length >= minPoints;
};
