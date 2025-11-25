export class AlertEngine {
  constructor(thresholdManager) {
    this.thresholdManager = thresholdManager;
  }

  generateAlertsFromSensorData(sensorData) {
    console.log('🚨 AlertEngine: Processing sensor data:', {
      isArray: Array.isArray(sensorData),
      length: sensorData?.length,
      sensorData
    });

    // DEBUG: Force testing pH=1.0 and turbidity=100
    if (sensorData.length > 0) {
      const testData = sensorData[sensorData.length - 1];
      if (testData.pH && testData.pH === 1.0) {
        console.log('🚨 DEBUG: Found pH = 1.0, testing threshold evaluation!');
      }
      if (testData.turbidity && testData.turbidity === 100) {
        console.log('🚨 DEBUG: Found turbidity = 100, testing threshold evaluation!');
      }
    }

    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      console.log('🚨 AlertEngine: No valid sensor data provided');
      return [];
    }

    const alerts = [];
    const latestReading = sensorData[sensorData.length - 1];

    console.log('🚨 AlertEngine: Latest reading:', {
      latestReading,
      readingKeys: Object.keys(latestReading),
      readingValues: {
        pH: latestReading.pH,
        temperature: latestReading.temperature,
        turbidity: latestReading.turbidity,
        salinity: latestReading.salinity
      }
    });

    for (const [parameter, value] of Object.entries(latestReading)) {
      console.log(`🚨 AlertEngine: Checking parameter ${parameter} = ${value}`);

      if (this.isWaterQualityParameter(parameter) && value !== null && value !== undefined) {
        console.log(`🚨 AlertEngine: Parameter ${parameter} is valid water quality parameter`);

        if (parameter.toLowerCase() === 'israining') {
          // Rain sensor: Always generate alert for rain status
          const alert = this.createRainAlert(parameter, value, latestReading);
          alerts.push(alert);
          console.log(`🚨 AlertEngine: Created rain alert for ${parameter}:`, alert);
        } else {
          // Traditional water quality parameters
          const alertLevel = this.thresholdManager.evaluateValue(parameter, value);
          console.log(`🚨 AlertEngine: Parameter ${parameter} alert level: ${alertLevel}`);

          if (alertLevel !== 'normal') {
            const alert = this.createAlert(parameter, value, alertLevel, latestReading);
            alerts.push(alert);
            console.log(`🚨 AlertEngine: Created alert for ${parameter}:`, alert);
          }
        }
      } else {
        console.log(`🚨 AlertEngine: Parameter ${parameter} is NOT a valid water quality parameter or has invalid value`);
      }
    }

    console.log(`🚨 AlertEngine: Generated ${alerts.length} alerts total`);
    return alerts;
  }

  createRainAlert(parameter, value, reading) {
    const rainStatus = this.getRainStatusText(value);
    const alertLevel = value === 2 ? 'warning' : 'info';
    const isWarning = alertLevel === 'warning';

    return {
      id: this.generateAlertId(),
      parameter: parameter.toLowerCase(),
      value: parseFloat(value),
      alertLevel,
      type: 'info',  // Always blue for weather alerts
      title: this.generateRainAlertTitle(value),
      message: this.generateRainAlertMessage(value),
      timestamp: reading.datetime || reading.timestamp || new Date(),
      severity: isWarning ? 'medium' : 'low',
      isWarning: alertLevel === 'warning'
    };
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
      threshold,
      isWarning: alertLevel === 'warning'
    };
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAlertTitle(parameter, value, alertLevel) {
    const threshold = this.thresholdManager.getThreshold(parameter);
    const direction = this.determineValueDirection(value, threshold);
    const flag = alertLevel === 'critical' ? '🚨' : '⚠️';

    return this.getActionableTitle(parameter, value, alertLevel, direction, flag);
  }

  determineValueDirection(value, threshold) {
    if (!threshold) return 'unknown';

    if (value > threshold.max) return 'high';
    if (value < threshold.min) return 'low';

    return 'within_range';
  }

  getActionableTitle(parameter, value, alertLevel, direction, flag) {
    const paramLower = parameter.toLowerCase();
    const valueFormatted = this.formatParameterValue(parameter, value);

    const titles = {
      ph: {
        high: {
          critical: `${flag} pH Too High - ${valueFormatted}`,
          warning: `${flag} pH Rising - ${valueFormatted}`
        },
        low: {
          critical: `${flag} pH Too Low - ${valueFormatted}`,
          warning: `${flag} pH Falling - ${valueFormatted}`
        }
      },
      temperature: {
        high: {
          critical: `${flag} Temperature Critical - ${valueFormatted}`,
          warning: `${flag} Temperature High - ${valueFormatted}`
        },
        low: {
          critical: `${flag} Temperature Too Low - ${valueFormatted}`,
          warning: `${flag} Temperature Low - ${valueFormatted}`
        }
      },
      turbidity: {
        high: {
          critical: `${flag} Turbidity Critical - ${valueFormatted}`,
          warning: `${flag} Water Cloudy - ${valueFormatted}`
        },
        low: {
          critical: `${flag} Turbidity Too Low - ${valueFormatted}`,
          warning: `${flag} Turbidity Low - ${valueFormatted}`
        }
      },
      salinity: {
        high: {
          critical: `${flag} Salinity Too High - ${valueFormatted}`,
          warning: `${flag} Salinity Rising - ${valueFormatted}`
        },
        low: {
          critical: `${flag} Salinity Too Low - ${valueFormatted}`,
          warning: `${flag} Salinity Falling - ${valueFormatted}`
        }
      },

    };

    const paramTitles = titles[paramLower];
    if (paramTitles?.[direction]?.[alertLevel]) {
      return paramTitles[direction][alertLevel];
    }

    const paramName = parameter.charAt(0).toUpperCase() + parameter.slice(1);
    return `${flag} ${paramName} ${alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1)} - ${valueFormatted}`;
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
      case 'israining':
        return this.getRainStatusText(numValue);
      default:
        return numValue.toFixed(2);
    }
  }

  getRainStatusText(value) {
    switch (parseInt(value)) {
      case 0:
        return 'No Rain';
      case 1:
        return 'Raining';
      case 2:
        return 'Heavy Rain';
      default:
        return `Unknown (${value})`;
    }
  }

  generateRainAlertTitle(value) {
    const status = this.getRainStatusText(value);
    return `Weather Update: ${status} Detected`;
  }

  generateRainAlertMessage(value) {
    const status = this.getRainStatusText(value);

    switch (parseInt(value)) {
      case 0:
        return 'No precipitation detected. Water parameters are stable.';
      case 1:
        return 'Light to moderate rain detected. Monitor water parameters for potential changes in turbidity and pH.';
      case 2:
        return 'Heavy rain detected. Increased monitoring recommended as runoff may affect water quality parameters.';
      default:
        return `Rain sensor status: ${status}. Monitor water parameters closely.`;
    }
  }

  isWaterQualityParameter(parameter) {
    const waterQualityParams = ['ph', 'temperature', 'turbidity', 'salinity', 'israining'];
    return waterQualityParams.includes(parameter.toLowerCase());
  }
}
