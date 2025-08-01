/**
 * Returns the threshold values for all water quality parameters of a fishpond.
 * @returns {Object} An object containing min and max values for pH, temperature, salinity, and tds.
 */
export function getWaterQualityThresholds() {
  return {
    ph: { min: 6.5, max: 8 },
    temperature: { min: 24, max: 30 },
    salinity: { min: 0, max: 35 },
    tds: { min: 60, max: 90 }
  };
}

