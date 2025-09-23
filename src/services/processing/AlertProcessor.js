// src/services/processing/AlertProcessor.js
export class AlertProcessor {
    constructor(alertRepository, cacheService) {
      this.alertRepository = alertRepository;
      this.cacheService = cacheService;
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
      const recommendations = {
        ph: {
          critical: ['Immediate pH adjustment required', 'Check dosing systems'],
          warning: ['Monitor pH levels closely', 'Consider buffer adjustment']
        },
        temperature: {
          critical: ['Check cooling/heating systems', 'Reduce system load'],
          warning: ['Monitor temperature trends', 'Check environmental factors']
        },
        turbidity: {
          critical: ['Backwash filters immediately', 'Check coagulation process'],
          warning: ['Schedule filter maintenance', 'Monitor upstream conditions']
        },
        salinity: {
          critical: ['Check dilution systems', 'Verify source water quality'],
          warning: ['Monitor evaporation rates', 'Check water sources']
        }
      };
  
      const paramRecs = recommendations[alert.parameter.toLowerCase()];
      if (!paramRecs) return ['Monitor parameter closely'];
  
      return paramRecs[alert.alertLevel] || ['Monitor parameter closely'];
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