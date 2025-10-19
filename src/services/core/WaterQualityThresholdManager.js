import { getWaterQualityThresholds } from '../../constants/thresholds';

export class WaterQualityThresholdManager {
    constructor() {
      // Use thresholds from constants file instead of hardcoded values
      const thresholds = getWaterQualityThresholds();

      // Convert to the format expected by the rest of the system
      // Add critical thresholds based on the normal ranges
      this.thresholds = {
        pH: {
          min: thresholds.pH.min,
          max: thresholds.pH.max,
          critical: { min: thresholds.pH.min - 0.5, max: thresholds.pH.max + 0.5 }
        },
        temperature: {
          min: thresholds.temperature.min,
          max: thresholds.temperature.max,
          critical: { min: thresholds.temperature.min - 6, max: thresholds.temperature.max + 5 }
        },
        turbidity: {
          min: thresholds.turbidity.min,
          max: thresholds.turbidity.max,
          critical: { max: thresholds.turbidity.max * 2 }
        },
        salinity: {
          min: thresholds.salinity.min,
          max: thresholds.salinity.max,
          critical: { max: thresholds.salinity.max * 2 }
        },
        tds: { max: 500, critical: { max: 1000 } } // TDS not in thresholds.js, keeping existing
      };

      console.log('ThresholdManager initialized with thresholds from constants:', this.thresholds);
    }
  
    getThreshold(parameter) {
      return this.thresholds[parameter.toLowerCase()];
    }
    updateThreshold(parameter, threshold) {
      this.thresholds[parameter.toLowerCase()] = threshold;
    }
  
    evaluateValue(parameter, value) {
      console.log(`🚨 ThresholdManager: Evaluating ${parameter} = ${value}`);
      
      const threshold = this.getThreshold(parameter);
      console.log(`🚨 ThresholdManager: Threshold for ${parameter}:`, threshold);
      
      if (!threshold) {
        console.log(`🚨 ThresholdManager: No threshold found for ${parameter}, returning normal`);
        return 'normal';
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        console.log(`🚨 ThresholdManager: Invalid numeric value for ${parameter}, returning normal`);
        return 'normal';
      }

      console.log(`🚨 ThresholdManager: Numeric value for ${parameter}: ${numValue}`);

      if (threshold.critical) {
        if (threshold.critical.min && numValue < threshold.critical.min) {
          console.log(`🚨 ThresholdManager: ${parameter} = ${numValue} is below critical min ${threshold.critical.min}, returning critical`);
          return 'critical';
        }
        if (threshold.critical.max && numValue > threshold.critical.max) {
          console.log(`🚨 ThresholdManager: ${parameter} = ${numValue} is above critical max ${threshold.critical.max}, returning critical`);
          return 'critical';
        }
      }

      if (threshold.min && numValue < threshold.min) {
        console.log(`🚨 ThresholdManager: ${parameter} = ${numValue} is below min ${threshold.min}, returning warning`);
        return 'warning';
      }
      if (threshold.max && numValue > threshold.max) {
        console.log(`🚨 ThresholdManager: ${parameter} = ${numValue} is above max ${threshold.max}, returning warning`);
        return 'warning';
      }

      console.log(`🚨 ThresholdManager: ${parameter} = ${numValue} is within normal range, returning normal`);
      return 'normal';
    }
  
    getAllThresholds() {
      return { ...this.thresholds };
    }
  }