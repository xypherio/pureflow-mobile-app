export class WaterQualityThresholdManager {
    constructor() {
      this.thresholds = {
        pH: { min: 6.5, max: 8.5, critical: { min: 6.0, max: 9.0 } },
        temperature: { min: 26, max: 30, critical: { min: 20, max: 35 } },
        turbidity: { max: 50, critical: { max: 100 } },
        salinity: { max: 5, critical: { max: 10 } },
        tds: { max: 500, critical: { max: 1000 } }
      };
    }
  
    getThreshold(parameter) {
      return this.thresholds[parameter.toLowerCase()];
    }
  
    updateThreshold(parameter, threshold) {
      this.thresholds[parameter.toLowerCase()] = threshold;
    }
  
    evaluateValue(parameter, value) {
      const threshold = this.getThreshold(parameter);
      if (!threshold) return 'normal';
  
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'normal';
  
      if (threshold.critical) {
        if (threshold.critical.min && numValue < threshold.critical.min) return 'critical';
        if (threshold.critical.max && numValue > threshold.critical.max) return 'critical';
      }
  
      if (threshold.min && numValue < threshold.min) return 'warning';
      if (threshold.max && numValue > threshold.max) return 'warning';
  
      return 'normal';
    }
  
    getAllThresholds() {
      return { ...this.thresholds };
    }
  }