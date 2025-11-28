// Types and constants for forecast parameters
export const FORECAST_PARAMETERS = [
  { key: 'pH', label: 'pH', unit: '' },
  { key: 'Temperature', label: 'Temperature', unit: '°C' },
  { key: 'Turbidity', label: 'Turbidity', unit: ' NTU' },
  { key: 'Salinity', label: 'Salinity', unit: ' ppt' }
];

export const PARAMETER_RANGES = {
  pH: { min: 0, max: 14, optimal: [6.5, 8.5] },
  Temperature: { min: 20, max: 35, optimal: [25, 30] },
  Turbidity: { min: 0, max: 50, optimal: [0, 10] },
  Salinity: { min: 30, max: 40, optimal: [32, 37] },
};

/**
 * Formats parameter values for display with appropriate units
 * @param {string} key - Parameter name (pH, Temperature, Turbidity, Salinity)
 * @param {number} value - Raw parameter value
 * @returns {string} - Formatted value with units or "-" if null/undefined
 */
export function formatValue(key, value) {
  if (value === null || value === undefined) return "-";
  const roundedValue = Math.round(value * 100) / 100;
  if (key === "pH") return String(roundedValue);
  if (key === "Temperature") return `${roundedValue}°C`;
  if (key === "Turbidity") return `${roundedValue} NTU`;
  if (key === "Salinity") return `${roundedValue} ppt`;
  return String(roundedValue);
}

/**
 * Gets emoji icon for a parameter
 * @param {string} param - Parameter name
 * @returns {string} - Emoji icon
 */
export function getParameterIcon(param) {
  switch (param) {
    case 'pH': return '⚗️';
    case 'Temperature': return '🌡️';
    case 'Turbidity': return '💧';
    case 'Salinity': return '🧂';
    default: return '📊';
  }
}

/**
 * Gets trend information for a parameter
 * @param {string} param - Parameter name
 * @param {string} trend - Trend value ('rising', 'falling', 'stable')
 * @returns {object} - Trend info (label, icon, color)
 */
export function getTrendInfo(param, trend = 'stable') {
  return {
    label: trend === 'rising' ? 'Improving' : trend === 'falling' ? 'Worsening' : 'Stable',
    icon: trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→',
    color: trend === 'rising' ? '#22c55e' : trend === 'falling' ? '#ef4444' : '#9ca3af',
  };
}

/**
 * Gets theme colors for a parameter
 * @param {string} param - Parameter name
 * @returns {object} - Color theme
 */
export function getParameterTheme(param) {
  switch (param) {
    case 'pH':
      return { color: '#007bff' };
    case 'Temperature':
      return { color: '#ef4444' };
    case 'Turbidity':
      return { color: '#28a745' };
    case 'Salinity':
      return { color: '#8b5cf6' };
    default:
      return { color: '#666' };
  }
}

/**
 * Converts hex color to rgba string with specified alpha
 * @param {string} hex - Hex color string (e.g., "#007bff")
 * @param {number} alpha - Opacity value (0-1)
 * @returns {string} - rgba color string
 */
export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Gets data source display text
 * @param {string} dataSource - Data source type
 * @returns {string} - Human readable description
 */
export function getDataSourceInfo(dataSource) {
  switch (dataSource) {
    case 'api':
      return 'Live Forecast from API';
    case 'firebase':
      return 'Stored Forecast Data';
    case 'cached':
      return 'Cached Forecast Data';
    default:
      return null;
  }
}
