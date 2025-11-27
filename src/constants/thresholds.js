import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Returns the threshold values for all water quality parameters of a fishpond based on water type.
 * @param {string} fishpondType - The type of fishpond ('freshwater' or 'saltwater')
 * @returns {Object} An object containing min and max values for pH, temperature, salinity, and turbidity.
 */
export function getWaterQualityThresholds(fishpondType = 'freshwater') {
  const thresholds = {
    freshwater: {
      pH: { min: 6.5, max: 8.5, critical: { min: 6.0, max: 9.0 } },
      temperature: { min: 26, max: 30, critical: { min: 20, max: 35 } },
      salinity: { min: 0, max: 5, critical: { max: 10 } },
      turbidity: { min: 0, max: 50, critical: { max: 60 } }
    },
    saltwater: {
      pH: { min: 7.5, max: 8.5, critical: { min: 7.0, max: 9.0 } },
      temperature: { min: 24, max: 30, critical: { min: 18, max: 35 } },
      salinity: { min: 15, max: 35, critical: { max: 70 } },
      turbidity: { min: 0, max: 60, critical: { max: 60 } }
    }
  };

  return thresholds[fishpondType] || thresholds.freshwater;
}

/**
 * Returns water quality thresholds based on the user's fishpond type settings.
 * @returns {Promise<Object>} Promise that resolves to threshold values for the current fishpond type.
 */
export async function getWaterQualityThresholdsFromSettings() {
  try {
    const savedSettings = await AsyncStorage.getItem('pureflowSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return getWaterQualityThresholds(settings.fishpondType);
    }
  } catch (error) {
    console.warn('Failed to load settings for thresholds:', error);
  }

  // Return freshwater defaults if settings can't be loaded
  return getWaterQualityThresholds('freshwater');
}
