export class AlertEngine {
    constructor(thresholdManager) {
      this.thresholdManager = thresholdManager;
    }
  
    generateAlertsFromSensorData(sensorData) {
      if (!Array.isArray(sensorData) || sensorData.length === 0) {
        return [];
      }
  
      const alerts = [];
      const latestReading = sensorData[sensorData.length - 1];
  
      for (const [parameter, value] of Object.entries(latestReading)) {
        if (this.isWaterQualityParameter(parameter) && value !== null && value !== undefined) {
          const alertLevel = this.thresholdManager.evaluateValue(parameter, value);
          
          if (alertLevel !== 'normal') {
            const alert = this.createAlert(parameter, value, alertLevel, latestReading);
            alerts.push(alert);
          }
        }
      }
  
      return alerts;
    }
  
    createAlert(parameter, value, alertLevel, reading) {
      const threshold = this.thresholdManager.getThreshold(parameter);
      
      return {
        id: this.generateAlertId(),
        parameter: parameter.toLowerCase(),
        value: parseFloat(value),
        alertLevel,
        type: alertLevel === 'critical' ? 'error' : 'warning',
        title: this.generateAlertTitle(parameter, value, alertLevel),
        message: this.generateAlertMessage(parameter, value, threshold, alertLevel),
        timestamp: reading.datetime || reading.timestamp || new Date(),
        severity: alertLevel === 'critical' ? 'high' : 'medium',
        threshold
      };
    }
  
    generateAlertId() {
      return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  
    generateAlertTitle(parameter, value, alertLevel) {
      const paramName = parameter.charAt(0).toUpperCase() + parameter.slice(1);
      const levelText = alertLevel === 'critical' ? 'Critical' : 'Warning';
      return `${levelText}: ${paramName} ${alertLevel === 'critical' ? 'Critical' : 'Out of Range'}`;
    }
  
    generateAlertMessage(parameter, value, threshold, alertLevel) {
      const paramName = parameter.charAt(0).toUpperCase() + parameter.slice(1);
      const formattedValue = this.formatParameterValue(parameter, value);
      
      let rangeText = '';
      if (threshold.min && threshold.max) {
        rangeText = ` (Safe range: ${threshold.min} - ${threshold.max})`;
      } else if (threshold.max) {
        rangeText = ` (Safe max: ${threshold.max})`;
      } else if (threshold.min) {
        rangeText = ` (Safe min: ${threshold.min})`;
      }
  
      return `${paramName} reading of ${formattedValue} is ${alertLevel}${rangeText}`;
    }
  
    formatParameterValue(parameter, value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return String(value);
  
      switch (parameter.toLowerCase()) {
        case 'ph':
          return numValue.toFixed(2);
        case 'temperature':
          return `${numValue.toFixed(1)}°C`;
        case 'turbidity':
          return `${numValue.toFixed(1)} NTU`;
        case 'salinity':
          return `${numValue.toFixed(1)} ppt`;
        case 'tds':
          return `${numValue.toFixed(0)} ppm`;
        default:
          return numValue.toFixed(2);
      }
    }
  
    isWaterQualityParameter(parameter) {
      const waterQualityParams = ['ph', 'temperature', 'turbidity', 'salinity', 'tds'];
      return waterQualityParams.includes(parameter.toLowerCase());
    }
  }