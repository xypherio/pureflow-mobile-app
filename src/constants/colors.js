// PureFlow Mobile App Color Scheme
// Primary colors for the app theme
export const colors = {

  // Primary brand colors
  primary: '#2455A9',        // Main brand blue
  primaryDark: '#1A3F7A',    // Darker shade for emphasis
  primaryLight: '#4A7BC8',  
  
  //Parameter Colors
  phColor: '#007bff',
  tempColor: '#e83e8c',
  turbidityColor: '#28a745',
  salinityColor: '#8b5cf6',
  
  // Secondary colors
  secondary: '#4ECDC4',      // Teal accent color
  secondaryDark: '#3BA99A',  // Darker teal
  secondaryLight: '#7DDDD5', // Lighter teal
  
  // Success, warning, and error colors
  success: '#28A745',        // Green for success states
  warning: '#FFC107',        // Yellow for warnings
  error: '#DC3545',          // Red for errors
  
  // Neutral colors
  white: '#FFFFFF',          // Pure white
  black: '#000000',          // Pure black
  
  // Background colors
  background: '#f0f8fe',     // Main app background
  backgroundSecondary: '#e2f1fc', // Secondary background
  backgroundTertiary: '#bee3f9',  // Tertiary background
  
  // Surface colors
  surface: '#FFFFFF',        // Card and component surfaces
  surfaceSecondary: '#F8F9FA', // Secondary surfaces
  
  // Text colors
  text: '#212529',           // Primary text color
  textSecondary: '#6C757D',  // Secondary text color
  textTertiary: '#ADB5BD',   // Tertiary text color
  textInverse: '#FFFFFF',    // Text on dark backgrounds
  
  // Border colors
  border: '#DEE2E6',         // Light borders
  borderSecondary: '#CED4DA', // Secondary borders
  borderDark: '#ADB5BD',     // Darker borders
  
  // Chart colors (matching realtime data cards)
  chart: {
    pH: '#FF6B6B',           // Red for pH
    temperature: '#4ECDC4',   // Teal for temperature
    turbidity: '#45B7D1',     // Blue for turbidity
    salinity: '#96CEB4',      // Green for salinity
  },
  
  // Status colors
  status: {
    online: '#28A745',       // Green for online status
    offline: '#DC3545',      // Red for offline status
    warning: '#FFC107',      // Yellow for warning status
    maintenance: '#6F42C1',  // Purple for maintenance
  },
  
  // Water quality threshold colors
  waterQuality: {
    excellent: '#28A745',     // Green for excellent quality
    good: '#20C997',         // Teal for good quality
    fair: '#FFC107',         // Yellow for fair quality
    poor: '#FD7E14',         // Orange for poor quality
    critical: '#DC3545',     // Red for critical quality
  },
  
  // Gradient colors
  gradients: {
    primary: ['#2455A9', '#4A7BC8'],
    secondary: ['#4ECDC4', '#7DDDD5'],
    success: ['#28A745', '#20C997'],
    warning: ['#FFC107', '#FD7E14'],
    error: ['#DC3545', '#E74C3C'],
  },
  
  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.15)',
    dark: 'rgba(0, 0, 0, 0.25)',
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    medium: 'rgba(255, 255, 255, 0.5)',
    dark: 'rgba(0, 0, 0, 0.5)',
  },
};

// Chart-specific color getters for easy access
export const getChartColor = (parameter) => {
  return colors.chart[parameter] || colors.primary;
};

export const getWaterQualityColor = (quality) => {
  return colors.waterQuality[quality] || colors.textSecondary;
};

export const getStatusColor = (status) => {
  return colors.status[status] || colors.textSecondary;
};

// Export individual colors for direct import if needed
export const {
  primary,
  secondary,
  success,
  warning,
  error,
  white,
  black,
  background,
  text,
  border,
  textSecondary,
  textTertiary,
} = colors;

// Default export
export default colors;
