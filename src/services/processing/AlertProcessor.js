// src/services/processing/AlertProcessor.js
export class AlertProcessor {
    constructor(alertRepository, cacheService, thresholdManager = null) {
      this.alertRepository = alertRepository;
      this.cacheService = cacheService;
      this.thresholdManager = thresholdManager;
      this.processors = [];
      this.deduplicationWindow = 5 * 60 * 1000; // 5 minutes
      this.alertSignatures = new Map(); // For deduplication
    }
  
    // Add processing steps to the pipeline
    addProcessor(processor) {
      if (typeof processor.process !== 'function') {
        throw new Error('Processor must implement process method');
      }
      this.processors.push(processor);
    }
  
    // Process alerts through the pipeline
    async processAlerts(alerts) {
      if (!Array.isArray(alerts) || alerts.length === 0) {
        return { processed: [], skipped: [], errors: [] };
      }
  
      console.log(`🔄 Processing ${alerts.length} alerts through pipeline`);
  
      let currentAlerts = [...alerts];
      const results = {
        processed: [],
        skipped: [],
        errors: []
      };
  
      // Step 1: Validate alerts
      const validated = await this.validateAlerts(currentAlerts);
      currentAlerts = validated.valid;
      results.errors.push(...validated.invalid);
  
      // Step 2: Deduplicate alerts
      const deduplicated = await this.deduplicateAlerts(currentAlerts);
      currentAlerts = deduplicated.unique;
      results.skipped.push(...deduplicated.duplicates);
  
      // Step 3: Apply custom processors
      for (const processor of this.processors) {
        try {
          currentAlerts = await processor.process(currentAlerts);
        } catch (error) {
          console.error('❌ Error in alert processor:', error);
          // Continue processing with remaining alerts
        }
      }
  
      // Step 4: Enrich alerts with metadata
      currentAlerts = await this.enrichAlerts(currentAlerts);
  
      // Step 5: Categorize and prioritize
      currentAlerts = await this.categorizeAlerts(currentAlerts);
  
      results.processed = currentAlerts;
      
      console.log(`✅ Alert processing completed: ${results.processed.length} processed, ${results.skipped.length} skipped, ${results.errors.length} errors`);
      
      return results;
    }
  
    async validateAlerts(alerts) {
      const valid = [];
      const invalid = [];
  
      for (const alert of alerts) {
        const validation = this.validateAlert(alert);
        if (validation.isValid) {
          valid.push(alert);
        } else {
          invalid.push({
            alert,
            errors: validation.errors
          });
        }
      }
  
      return { valid, invalid };
    }
  
    validateAlert(alert) {
      const errors = [];
      const requiredFields = ['parameter', 'value', 'alertLevel', 'title'];
  
      // Check required fields
      for (const field of requiredFields) {
        if (alert[field] === undefined || alert[field] === null) {
          errors.push(`Missing required field: ${field}`);
        }
      }
  
      // Validate parameter value
      if (alert.value !== undefined && isNaN(parseFloat(alert.value))) {
        errors.push('Value must be a valid number');
      }
  
      // Validate alert level
      const validLevels = ['normal', 'warning', 'critical'];
      if (alert.alertLevel && !validLevels.includes(alert.alertLevel)) {
        errors.push(`Invalid alert level: ${alert.alertLevel}`);
      }
  
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    async deduplicateAlerts(alerts) {
      const unique = [];
      const duplicates = [];
      const now = Date.now();
  
      for (const alert of alerts) {
        const signature = this.generateAlertSignature(alert);
        const existing = this.alertSignatures.get(signature);
  
        if (existing && (now - existing.timestamp) < this.deduplicationWindow) {
          // This is a duplicate within the window
          duplicates.push({
            alert,
            reason: 'duplicate',
            originalTimestamp: existing.timestamp
          });
        } else {
          // This is unique or outside the window
          this.alertSignatures.set(signature, {
            alert,
            timestamp: now
          });
          unique.push(alert);
        }
      }
  
      // Clean old signatures
      this.cleanOldSignatures();
  
      return { unique, duplicates };
    }
  
    generateAlertSignature(alert) {
      return `${alert.parameter}-${alert.alertLevel}-${Math.round(alert.value * 100) / 100}`;
    }
  
    cleanOldSignatures() {
      const cutoff = Date.now() - this.deduplicationWindow;
      
      for (const [signature, data] of this.alertSignatures.entries()) {
        if (data.timestamp < cutoff) {
          this.alertSignatures.delete(signature);
        }
      }
    }
  
    async enrichAlerts(alerts) {
      const enriched = [];
  
      for (const alert of alerts) {
        const enrichedAlert = {
          ...alert,
          id: alert.id || this.generateAlertId(),
          timestamp: alert.timestamp || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          severity: this.calculateSeverity(alert),
          category: this.categorizeAlert(alert),
          metadata: await this.getAlertMetadata(alert)
        };
  
        enriched.push(enrichedAlert);
      }
  
      return enriched;
    }
  
    generateAlertId() {
      return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  
    calculateSeverity(alert) {
      if (alert.alertLevel === 'critical') return 'high';
      if (alert.alertLevel === 'warning') return 'medium';
      return 'low';
    }
  
    categorizeAlert(alert) {
      const parameterCategories = {
        ph: 'chemical',
        temperature: 'physical',
        turbidity: 'physical',
        salinity: 'chemical',
        tds: 'chemical'
      };
  
      return parameterCategories[alert.parameter.toLowerCase()] || 'general';
    }
  
    async getAlertMetadata(alert) {
      return {
        source: 'sensor',
        confidence: this.calculateConfidence(alert),
        impact: this.assessImpact(alert),
        recommendations: await this.getRecommendations(alert)
      };
    }
  
    calculateConfidence(alert) {
      // Simple confidence calculation based on parameter and value
      const parameterConfidence = {
        ph: 0.95,
        temperature: 0.90,
        turbidity: 0.85,
        salinity: 0.90
      };
  
      return parameterConfidence[alert.parameter.toLowerCase()] || 0.80;
    }
  
    assessImpact(alert) {
      const impacts = {
        critical: 'high',
        warning: 'medium',
        normal: 'low'
      };
  
      return impacts[alert.alertLevel] || 'low';
    }
  
    async getRecommendations(alert) {
      // Get threshold information to determine direction
      const threshold = alert.threshold || this.thresholdManager?.getThreshold(alert.parameter);
      const direction = this.determineRecommendationDirection(alert.value, threshold);
      const deviation = this.calculateDeviation(alert.value, threshold, direction);

      return this.generateContextualRecommendations(alert.parameter, alert.alertLevel, direction, deviation, alert.value);
    }

    determineRecommendationDirection(value, threshold) {
      if (!threshold) return 'unknown';

      if (value > threshold.max) return 'high';
      if (value < threshold.min) return 'low';

      return 'unknown';
    }

    calculateDeviation(value, threshold, direction) {
      if (!threshold || direction === 'unknown') return 0;

      if (direction === 'high') {
        return ((value - threshold.max) / threshold.max) * 100; // Percentage above max
      } else if (direction === 'low') {
        return ((threshold.min - value) / threshold.min) * 100; // Percentage below min
      }

      return 0;
    }

    generateContextualRecommendations(parameter, alertLevel, direction, deviation, value) {
      const paramLower = parameter.toLowerCase();
      const isCritical = alertLevel === 'critical';
      const isWarning = alertLevel === 'warning';

      const recommendationMap = {
        ph: this.getPHRecommendations(isCritical, direction, deviation, value),
        temperature: this.getTemperatureRecommendations(isCritical, direction, deviation, value),
        turbidity: this.getTurbidityRecommendations(isCritical, direction, deviation, value),
        salinity: this.getSalinityRecommendations(isCritical, direction, deviation, value),
        tds: this.getTDSRecommendations(isCritical, direction, deviation, value)
      };

      return recommendationMap[paramLower] || this.getDefaultRecommendations(parameter, alertLevel);
    }

    getPHRecommendations(isCritical, direction, deviation, value) {
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

    getTemperatureRecommendations(isCritical, direction, deviation, value) {
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

    getTurbidityRecommendations(isCritical, direction, deviation, value) {
      if (direction === 'high') {
        if (isCritical || deviation > 50) {
          return [
            'Backwash or clean filters immediately',
            'Check coagulation/flocculation processes',
            'Inspect for sediment sources or recent disturbances',
            'Reduce water flow to allow settling if appropriate',
            'Test filter pressure and media condition'
          ];
        } else if (isWarning || deviation > 10) {
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
        // Low turbidity is generally not a problem, but check for issues
        return [
          'Low turbidity noted - generally beneficial',
          'Monitor for system changes that might affect water clarity',
          'Ensure adequate disinfection if water becomes too clear'
        ];
      }
      return ['Monitor water clarity and filtration performance'];
    }

    getSalinityRecommendations(isCritical, direction, deviation, value) {
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

    getTDSRecommendations(isCritical, direction, deviation, value) {
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
  
    async categorizeAlerts(alerts) {
      return alerts.map(alert => ({
        ...alert,
        priority: this.calculatePriority(alert),
        urgency: this.calculateUrgency(alert),
        displayOrder: this.calculateDisplayOrder(alert)
      }));
    }
  
    calculatePriority(alert) {
      let priority = 0;
  
      // Base priority on severity
      const severityWeights = { high: 10, medium: 5, low: 1 };
      priority += severityWeights[alert.severity] || 1;
  
      // Adjust for parameter criticality
      const parameterWeights = {
        ph: 3,
        temperature: 2,
        turbidity: 2,
        salinity: 1
      };
      priority += parameterWeights[alert.parameter.toLowerCase()] || 1;
  
      return priority;
    }
  
    calculateUrgency(alert) {
      // How quickly does this need attention?
      if (alert.severity === 'high') return 'immediate';
      if (alert.severity === 'medium') return 'soon';
      return 'eventual';
    }
  
    calculateDisplayOrder(alert) {
      // Lower numbers show first
      let order = 0;
  
      // Prioritize by severity
      if (alert.severity === 'high') order += 1000;
      else if (alert.severity === 'medium') order += 500;
  
      // Then by timestamp (newer first)
      const timestamp = new Date(alert.timestamp).getTime();
      order += (Date.now() - timestamp) / 1000; // Seconds ago
  
      return order;
    }
  
    // Configuration methods
    setDeduplicationWindow(windowMs) {
      this.deduplicationWindow = windowMs;
    }
  
    clearDeduplicationCache() {
      this.alertSignatures.clear();
    }
  }
