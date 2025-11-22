/**
 * Sensor Data Utilities
 *
 * Utilities for validating sensor data readings and parsing timestamps
 * from Firebase realtime data structures.
 */

/**
 * Checks if the provided data contains valid sensor readings
 * @param {Object} data - Realtime data object
 * @returns {boolean} True if any sensor has valid readings
 */
export const validateSensorData = (data) => {
  if (!data) return false;

  const sensors = [
    data.pH,
    data.temperature,
    data.turbidity,
    data.salinity,
    data.reading?.pH,
    data.reading?.temperature,
    data.reading?.turbidity,
    data.reading?.salinity,
  ];

  return sensors.some(value =>
    value !== null &&
    value !== undefined &&
    !isNaN(value)
  );
};

/**
 * Parses timestamp from various possible data formats
 * @param {Object} data - Data object with potential timestamp fields
 * @returns {number|null} Unix timestamp or null if parsing fails
 */
export const parseTimestamp = (data) => {
  if (!data) return null;

  // Try different timestamp field formats
  const timestampFields = [
    data.timestamp,
    data.datetime,
    data.reading?.timestamp,
    data.reading?.datetime,
  ];

  for (const timestamp of timestampFields) {
    if (timestamp) {
      const parsed = new Date(timestamp).getTime();
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

/**
 * Checks if data is fresh based on timestamp and threshold
 * @param {Object} data - Data object with timestamp
 * @param {number} thresholdSeconds - Maximum age in seconds (default: 60)
 * @returns {boolean} True if data is within threshold
 */
export const isDataFresh = (data, thresholdSeconds = 60) => {
  const timestamp = parseTimestamp(data);
  if (!timestamp) return false;

  const now = Date.now();
  const ageSeconds = Math.floor((now - timestamp) / 1000);

  return ageSeconds <= thresholdSeconds;
};

/**
 * Gets weather display info based on isRaining value
 * @param {number} isRaining - Rainfall status (0=no rain, 1=light, 2=heavy)
 * @returns {Object} Weather info for display
 */
export const getWeatherInfo = (isRaining = 0) => {
  switch (isRaining) {
    case 1:
      return { label: "Light Rain", temp: "28°C", icon: "rain" };
    case 2:
      return { label: "Heavy Rain", temp: "26°C", icon: "rain-heavy" };
    default:
      return { label: "Sunny", temp: "32°C", icon: "sunny" };
  }
};
