/**
 * Returns the threshold values for all water quality parameters of a fishpond.
 * @returns {Object} An object containing min and max values for pH, temperature, salinity, and tds.
 */
export function getWaterQualityThresholds() {
  return {
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 26, max: 30 },
    salinity: { min: 0, max: 5 },
    turbidity: { min: 0, max: 50 }
  };
}

