import {
  WATER_QUALITY_THRESHOLDS,
  ALERT_SEVERITY,
  PROCESSING_ERRORS,
  PROCESSING_LOGGING_CONFIG
} from '../../constants/processing.js';
import { log as dataLog } from '../../utils/dataRepositoryUtils.js';

/**
 * Logs recommendation operations
 * @param {string} operation - Operation name
 * @param {...any} args - Additional log arguments
 */
function logRecommendation(operation, ...args) {
  const message = `[RECOMMENDATION:${operation}]`;
  dataLog(PROCESSING_LOGGING_CONFIG.CURRENT_LEVEL < PROCESSING_LOGGING_CONFIG.LOG_LEVELS.DEBUG ? 'info' : 'debug', message, ...args);
}

/**
 * Primary Recommendation Engine for water quality alerts
 */
export class RecommendationEngine {
  constructor(thresholdManager = null) {
    this.thresholdManager = thresholdManager;
    this.recommendationTemplates = new Map();
    this.parameterSpecificAdvice = new Map();
    this.initializeTemplates();
  }

  /**
   * Initialize recommendation templates
   */
  initializeTemplates() {
    this.recommendationTemplates.set('ph', this.getPHRecommendations.bind(this));
    this.recommendationTemplates.set('temperature', this.getTemperatureRecommendations.bind(this));
    this.recommendationTemplates.set('turbidity', this.getTurbidityRecommendations.bind(this));
    this.recommendationTemplates.set('salinity', this.getSalinityRecommendations.bind(this));
    this.recommendationTemplates.set('tds', this.getTDSRecommendations.bind(this));
  }

  /**
   * Generate contextual recommendations for a parameter
   * @param {string} parameter - Parameter name
   * @param {string} alertLevel - Alert severity
   * @param {string} direction - Direction ('high' or 'low')
   * @param {number} deviation - Deviation percentage
   * @param {number} value - Current parameter value
   * @returns {Array} Array of recommendation strings
   */
  generateRecommendations(parameter, alertLevel, direction, deviation, value) {
    try {
      const paramLower = parameter.toLowerCase();
      const recommendationFunction = this.recommendationTemplates.get(paramLower);

      if (recommendationFunction) {
        return recommendationFunction(alertLevel, direction, deviation, value);
      } else {
        return this.getDefaultRecommendations(parameter, alertLevel);
      }
    } catch (error) {
      logRecommendation('generation.error', `Failed to generate recommendations for ${parameter}:`, error.message);
      return [`Monitor ${parameter} levels closely and consult water quality guidelines.`];
    }
  }

  /**
   * Get pH-specific recommendations
   */
  getPHRecommendations(alertLevel, direction, deviation, value) {
    const isCritical = alertLevel === 'critical';
    const isWarning = alertLevel === 'warning';

    if (direction === 'high') {
      if (isCritical) {
        if (deviation > 20) {
          return [
            'URGENT: Add pH reducer immediately (sodium bisulfate or CO2)',
            'Stop all feeding and reduce aeration temporarily',
            'Test total alkalinity - may need to reduce carbonate hardness',
            'Monitor for fish stress and prepare emergency water change'
          ];
        } else if (deviation > 10) {
          return [
            'Add pH reducer (sodium bisulfate) gradually over 1-2 hours',
            'Reduce feeding by 50% and monitor fish behavior',
            'Check CO2 injection system if using pressurized CO2',
            'Test alkalinity levels and adjust buffer if needed'
          ];
        } else {
          return [
            'Add pH reducer (sodium bisulfate) slowly',
            'Verify CO2 injection system is functioning properly',
            'Monitor rate of pH change - avoid rapid drops'
          ];
        }
      } else {
        return [
          'Add pH reducer (sodium bisulfate) gradually',
          'Check CO2 injection and diffuser for proper aeration',
          'Monitor pH trend over next 4-6 hours',
          'Consider water change to stabilize alkalinity'
        ];
      }
    } else if (direction === 'low') {
      if (isCritical) {
        if (deviation > 20) {
          return [
            'URGENT: Add pH increaser immediately (baking soda or crushed coral)',
            'Increase aeration to release CO2 from water',
            'Test for ammonia or nitrite toxicity',
            'Prepare emergency water change with buffered water'
          ];
        } else if (deviation > 10) {
          return [
            'Add pH increaser (baking soda) gradually over 1-2 hours',
            'Increase surface agitation and air flow',
            'Test alkalinity - add buffer if low',
            'Monitor for rapid pH swings indicating system instability'
          ];
        } else {
          return [
            'Add pH increaser (baking soda) slowly',
            'Increase aeration and water movement',
            'Test total alkalinity and adjust if below 100ppm'
          ];
        }
      } else {
        return [
          'Add pH increaser (baking soda) gradually',
          'Check for excessive CO2 or low alkalinity',
          'Monitor pH stability over several hours',
          'Consider adding crushed coral or aragonite to substrate'
        ];
      }
    }
    return ['Monitor pH levels and maintain stability'];
  }

  /**
   * Get temperature-specific recommendations
   */
  getTemperatureRecommendations(alertLevel, direction, deviation, value) {
    const isCritical = alertLevel === 'critical';
    const isWarning = alertLevel === 'warning';

    if (direction === 'high') {
      if (isCritical) {
        return [
          'Activate cooling system immediately (chillers/fans)',
          'Increase aeration to improve oxygen levels',
          'Reduce feeding by 50-70% to lower metabolic heat',
          'Test dissolved oxygen levels - add oxygen if low',
          'Prepare cooler water for gradual mixing if needed'
        ];
      } else {
        return [
          'Check cooling equipment and water flow',
          'Increase water circulation and surface agitation',
          'Reduce feeding schedule temporarily',
          'Monitor temperature trend over next few hours',
          'Ensure adequate shade/lighting control'
        ];
      }
    } else if (direction === 'low') {
      if (isCritical) {
        return [
          'Activate heating system immediately',
          'Check heater functionality and thermostat settings',
          'Insulate tank to prevent heat loss',
          'Monitor fish for signs of temperature stress',
          'Gradually warm water using heater or warm water additions'
        ];
      } else {
        return [
          'Check and adjust heater settings',
          'Improve tank insulation and reduce drafts',
          'Monitor temperature stability over time',
          'Consider backup heating source if temperature fluctuates'
        ];
      }
    }
    return ['Maintain stable temperature conditions'];
  }

  /**
   * Get turbidity-specific recommendations
   */
  getTurbidityRecommendations(alertLevel, direction, deviation, value) {
    const isCritical = alertLevel === 'critical' || deviation > 50;

    if (direction === 'high') {
      if (isCritical) {
        return [
          'Backwash or clean filters immediately',
          'Check coagulation/flocculation processes',
          'Inspect for sediment sources or recent disturbances',
          'Reduce water flow to allow settling if appropriate',
          'Test filter pressure and media condition'
        ];
      } else if (alertLevel === 'warning' || deviation > 10) {
        return [
          'Schedule filter cleaning within 24 hours',
          'Monitor turbidity trend and particulate sources',
          'Check coagulation chemical dosing',
          'Inspect intake screens and pre-filters',
          'Consider sedimentation basin cleaning'
        ];
      } else {
        return [
          'Monitor turbidity levels closely',
          'Check for seasonal or weather-related causes',
          'Verify filtration system performance',
          'Schedule routine maintenance if trends continue'
        ];
      }
    } else if (direction === 'low') {
      return [
        'Low turbidity noted - generally beneficial',
        'Monitor for system changes that might affect water clarity',
        'Ensure adequate disinfection if water becomes too clear'
      ];
    }
    return ['Monitor water clarity and filtration performance'];
  }

  /**
   * Get salinity-specific recommendations
   */
  getSalinityRecommendations(alertLevel, direction, deviation, value) {
    const isCritical = alertLevel === 'critical';

    if (direction === 'high') {
      if (isCritical) {
        return [
          'Add fresh water gradually to reduce salinity',
          'Check evaporation rates and top-off procedures',
          'Verify salt dosing pumps and concentration',
          'Monitor for osmotic stress in aquatic life',
          'Test specific gravity and TDS correlation'
        ];
      } else {
        return [
          'Reduce salt additions or increase water changes',
          'Monitor evaporation rates vs. makeup water',
          'Check for brine concentration in dosing system',
          'Verify salinity meter calibration'
        ];
      }
    } else if (direction === 'low') {
      if (isCritical) {
        return [
          'Add salt or brine solution to increase salinity',
          'Check for excessive freshwater dilution',
          'Verify salt storage and mixing procedures',
          'Monitor for osmotic stress during adjustment'
        ];
      } else {
        return [
          'Adjust salt dosing to maintain target salinity',
          'Check for leaks or excessive water changes',
          'Monitor specific gravity trends',
          'Verify salt quality and purity'
        ];
      }
    }
    return ['Monitor salinity levels and maintain stability'];
  }

  /**
   * Get TDS-specific recommendations
   */
  getTDSRecommendations(alertLevel, direction, deviation, value) {
    const isCritical = alertLevel === 'critical';

    if (direction === 'high') {
      if (isCritical) {
        return [
          'Perform water change to reduce total dissolved solids',
          'Check for ion buildup from evaporation',
          'Verify reverse osmosis or filtration performance',
          'Monitor membrane or filter element condition'
        ];
      } else {
        return [
          'Increase water change frequency',
          'Monitor TDS trend and identify source of buildup',
          'Check reverse osmosis system performance',
          'Verify pre-filter and membrane condition'
        ];
      }
    } else if (direction === 'low') {
      return [
        'Low TDS noted - may indicate excessive dilution',
        'Monitor for system leaks or excessive water changes',
        'Verify source water quality if using RO water'
      ];
    }
    return ['Monitor TDS levels and water quality parameters'];
  }

  getDefaultRecommendations(parameter, alertLevel) {
    const paramName = parameter.charAt(0).toUpperCase() + parameter.slice(1);
    const levelText = alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1);

    return [
      `${levelText} ${paramName} levels detected`,
      `Monitor ${paramName.toLowerCase()} levels closely`,
      `Check equipment and processes related to ${paramName.toLowerCase()}`,
      'Document readings and trends for analysis'
    ];
  }

  /**
   * Generate specific recommendations for multiple affected parameters
   * @param {Array} parameters - Array of affected parameter names
   * @param {Array} analysisResults - Corresponding analysis results
   * @returns {Array} Array of recommendations
   */
  generateMultiParameterRecommendations(parameters, analysisResults) {
    if (!parameters || parameters.length <= 1) {
      return [];
    }

    const recommendations = [];
    const criticalCount = analysisResults.filter(r => r.severity === 'critical').length;
    const majorParameters = parameters.slice(0, 3); // Focus on first 3

    if (criticalCount > 0) {
      recommendations.push('MULTIPLE CRITICAL PARAMETERS: Immediate intervention required');
      recommendations.push(`Affected parameters: ${majorParameters.join(', ')}`);
      recommendations.push('Consider emergency water change with pre-treated water');
      recommendations.push('Monitor aquatic life closely and prepare quarantine if needed');
    } else {
      recommendations.push('Multiple parameters outside optimal ranges detected');
      recommendations.push(`Focus on: ${majorParameters.join(', ')}`);
      recommendations.push('Schedule corrective actions within next 24 hours');
    }

    return recommendations;
  }

  /**
   * Generate trend-based recommendations
   * @param {string} parameter - Parameter name
   * @param {Object} trendAnalysis - Trend analysis results
   * @returns {Array} Array of trend-based recommendations
   */
  generateTrendBasedRecommendations(parameter, trendAnalysis) {
    if (!trendAnalysis) return [];

    const recommendations = [];
    const { direction, change } = trendAnalysis;

    if (Math.abs(change) < 5) {
      return ['Parameter trending stable - maintain current conditions'];
    }

    const paramName = parameter.charAt(0).toUpperCase() + parameter.slice(1);

    if (direction === 'increasing') {
      const changePercent = Math.round(Math.abs(change));
      recommendations.push(`${paramName} trending upward (${changePercent}% increase)`);

      // Add parameter-specific trend advice
      switch (parameter.toLowerCase()) {
        case 'ph':
          recommendations.push('Monitor for potential alkalinity depletion');
          break;
        case 'temperature':
          recommendations.push('Check cooling system efficiency');
          break;
        case 'turbidity':
          recommendations.push('Inspect filtration system capacity');
          break;
      }
    } else if (direction === 'decreasing') {
      const changePercent = Math.round(Math.abs(change));
      recommendations.push(`${paramName} trending downward (${changePercent}% decrease)`);

      switch (parameter.toLowerCase()) {
        case 'ph':
          recommendations.push('Monitor for excessive CO2 or low alkalinity');
          break;
        case 'temperature':
          recommendations.push('Verify heating system functionality');
          break;
      }
    }

    return recommendations;
  }

  /**
   * Assess recommendation urgency and priority
   * @param {string} alertLevel - Alert level
   * @param {number} deviation - Deviation percentage
   * @param {string} direction - Trend direction
   * @returns {Object} Urgency and priority assessment
   */
  assessRecommendationPriority(alertLevel, deviation, direction) {
    let priority = ALERT_SEVERITY.LOW.priority;
    let urgency = 'routine';

    if (alertLevel === 'critical') {
      priority = ALERT_SEVERITY.CRITICAL.priority;
      urgency = 'immediate';
    } else if (alertLevel === 'warning') {
      priority = ALERT_SEVERITY.HIGH.priority;
      urgency = 'soon';
    } else if (deviation > 15 || Math.abs(deviation) < 5) {
      priority = ALERT_SEVERITY.MEDIUM.priority;
      urgency = 'routine';
    }

    if (direction === 'increasing' && deviation > 20) {
      urgency = 'immediate';
      priority = ALERT_SEVERITY.CRITICAL.priority;
    }

    return { priority, urgency };
  }

  /**
   * Validate recommendation templates
   * @returns {boolean} Whether templates are valid
   */
  validateTemplates() {
    const expectedParameters = ['ph', 'temperature', 'turbidity', 'salinity', 'tds'];

    for (const param of expectedParameters) {
      if (!this.recommendationTemplates.has(param)) {
        logRecommendation('validation.error', `Missing template for parameter: ${param}`);
        return false;
      }
    }

    logRecommendation('validation.success', 'All recommendation templates validated');
    return true;
  }

  /**
   * Get supported parameters
   * @returns {Array} Array of supported parameter names
   */
  getSupportedParameters() {
    return Array.from(this.recommendationTemplates.keys());
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
