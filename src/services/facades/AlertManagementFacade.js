/**
 * AlertManagementFacade.js
 * 
 * A facade that provides a simplified interface for managing water quality alerts.
 * Coordinates between alert generation, processing, notification, and persistence.
 * 
 * Responsibilities:
 * - Process sensor data to generate alerts
 * - Manage alert lifecycle (creation, processing, resolution)
 * - Coordinate notifications for critical alerts
 * - Handle alert persistence and retrieval
 * 
 * @module AlertManagementFacade
 */

import { performanceMonitor } from '@utils/performance-monitor';

/**
 * Provides a high-level interface for managing the entire alert lifecycle.
 * This includes alert generation, processing, notification, and persistence.
 */
export class AlertManagementFacade {
    /**
     * Creates a new AlertManagementFacade instance.
     * 
     * @param {Object} dependencies - Required dependencies
     * @param {Object} dependencies.alertEngine - Engine for generating alerts from sensor data
     * @param {Object} dependencies.alertProcessor - Service for processing and enriching alerts
     * @param {Object} dependencies.alertRepository - Repository for alert persistence
     * @param {Object} dependencies.waterQualityNotifier - Service for sending notifications
     * @param {Object} dependencies.thresholdManager - Manages alert thresholds
     * @param {Object} dependencies.dataCacheService - Service for caching alert data
     */
    constructor({
      alertEngine,
      alertProcessor,
      alertRepository,
      waterQualityNotifier,
      thresholdManager,
      dataCacheService
    }) {
      this.alertEngine = alertEngine;
      this.alertProcessor = alertProcessor;
      this.alertRepository = alertRepository;
      this.waterQualityNotifier = waterQualityNotifier;
      this.thresholdManager = thresholdManager;
      this.dataCacheService = dataCacheService;
    }
  
    /**
     * Processes new sensor data through the alert pipeline.
     * 
     * This method orchestrates the entire alert processing workflow:
     * 1. Generates alerts from sensor data
     * 2. Processes alerts through the alert processor
     * 3. Persists new alerts
     * 4. Sends notifications for high-priority alerts
     * 
     * @param {Object} sensorData - Raw sensor data to process
     * @param {string} sensorData.id - Unique identifier for the sensor reading
     * @param {number} sensorData.timestamp - Unix timestamp of the reading
     * @param {Object} sensorData.parameters - Key-value pairs of parameter readings
     * @returns {Promise<Object>} Results containing processed alerts and notifications
     * @property {Array} results.newAlerts - Newly created alerts
     * @property {Array} results.processedAlerts - All processed alerts
     * @property {Array} results.notifications - Sent notifications
     * @property {Array} results.errors - Any errors that occurred during processing
     * @property {string} results.dataSignature - Unique signature of the processed data
     */
    async processSensorData(sensorData) {
      return await performanceMonitor.measureAsync('alertFacade.processSensorData', async () => {
        console.log('🚨 Processing sensor data for alerts...');
  
        try {
          // Initialize results structure
          const results = {
            newAlerts: [],
            processedAlerts: [],
            notifications: [],
            errors: [],
            dataSignature: this.generateDataSignature(sensorData)
          };
  
          // Step 1: Generate alerts from sensor data using the alert engine
          const generatedAlerts = this.alertEngine.generateAlertsFromSensorData(sensorData);
          console.log(`🔍 Generated ${generatedAlerts.length} potential alerts`);
  
          if (generatedAlerts.length === 0) {
            return { ...results, message: 'No alerts generated' };
          }
          
          // Step 2: Process alerts through the alert processor pipeline
          const processorResults = await this.alertProcessor.processAlerts(generatedAlerts);
          
          // Merge processor results with our results
          results.processedAlerts = processorResults.processed || [];
          results.newAlerts = processorResults.processed.filter(alert => 
            alert.status === 'new' || alert.status === 'escalated'
          );
          results.errors = processorResults.errors || [];
          
          // Log processing summary
          console.log(`✅ Processed ${results.processedAlerts.length} alerts (${results.newAlerts.length} new)`);
          if (results.errors.length > 0) {
            console.warn(`⚠️ Encountered ${results.errors.length} processing errors`);
          }
          results.errors.push(...processorResults.errors);

          // Step 3: Save new alerts
          if (processorResults.processed.length > 0) {
            try {
              await this.alertRepository.saveAlerts(processorResults.processed);
              results.newAlerts = processorResults.processed;
              console.log(`✅ Saved ${processorResults.processed.length} new alerts`);
            } catch (error) {
              console.error('❌ Error saving alerts:', error);
              results.errors.push({ type: 'save_error', message: error.message });
            }
          }

          // Step 4: Send notifications for high-priority alerts
          const highPriorityAlerts = processorResults.processed.filter(alert =>
            alert.severity === 'high' || alert.alertLevel === 'critical'
          );
  
          for (const alert of highPriorityAlerts) {
            try {
              const notificationResult = await this.waterQualityNotifier.notifyWaterQualityAlert(
                alert.parameter,
                alert.value,
                alert.alertLevel
              );
  
              if (notificationResult.success) {
                results.notifications.push({
                  alertId: alert.id,
                  parameter: alert.parameter,
                  notificationId: notificationResult.notificationId
                });
              }
            } catch (error) {
              console.error(`❌ Error sending notification for alert ${alert.id}:`, error);
              results.errors.push({
                type: 'notification_error',
                alertId: alert.id,
                message: error.message
              });
            }
          }
  
          // Step 5: Invalidate alert cache
          await this.dataCacheService.invalidateAlerts();
  
          console.log(`✅ Alert processing completed: ${results.newAlerts.length} new, ${results.notifications.length} notifications sent`);
          return results;
  
        } catch (error) {
          console.error('❌ Critical error in alert processing:', error);
          throw error;
        }
      });
    }
  
    /**
     * Get processed alerts for display
     */
    async getAlertsForDisplay(options = {}) {
      const {
        severity = null,
        parameter = null,
        limit = 20,
        useCache = true
      } = options;
  
      try {
        // Check cache first
        const cacheKey = `display_${severity || 'all'}_${parameter || 'all'}_${limit}`;
        if (useCache) {
          const cached = await this.dataCacheService.getCachedAlerts(cacheKey);
          if (cached) {
            return cached;
          }
        }
  
        // Fetch from repository
        const alerts = await this.alertRepository.getAlerts({
          limitCount: limit,
          filterSeverity: severity,
          filterParameter: parameter
        });
  
        // Process for display
        const displayAlerts = alerts.map(alert => ({
          ...alert,
          displayMessage: this.generateDisplayMessage(alert),
          timeAgo: this.calculateTimeAgo(alert.timestamp),
          actionRequired: this.determineActionRequired(alert),
          priority: this.calculateDisplayPriority(alert)
        }));
  
        // Sort by priority and recency
        displayAlerts.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority; // Higher priority first
          }
          return new Date(b.timestamp) - new Date(a.timestamp); // More recent first
        });
  
        // Cache result
        if (useCache) {
          await this.dataCacheService.cacheAlerts(cacheKey, displayAlerts);
        }
  
        return displayAlerts;
  
      } catch (error) {
        console.error('❌ Error getting alerts for display:', error);
        throw error;
      }
    }
  
    /**
     * Update alert thresholds
     */
    async updateThresholds(newThresholds) {
      try {
        // Update thresholds in manager
        for (const [parameter, threshold] of Object.entries(newThresholds)) {
          this.thresholdManager.updateThreshold(parameter, threshold);
        }
  
        // Invalidate caches that depend on thresholds
        await this.dataCacheService.invalidateAlerts();
        await this.dataCacheService.invalidateSensorData();
  
        console.log('✅ Alert thresholds updated successfully');
        return { success: true };
  
      } catch (error) {
        console.error('❌ Error updating thresholds:', error);
        throw error;
      }
    }
  
    /**
     * Test alert system
     */
    async testAlertSystem() {
      try {
        const testData = [{
          pH: 9.5,
          temperature: 36,
          turbidity: 75,
          salinity: 2.5,
          datetime: new Date()
        }];
  
        console.log('🧪 Testing alert system...');
        const result = await this.processSensorData(testData);
  
        return {
          success: true,
          testData,
          result,
          message: `Generated ${result.newAlerts.length} test alerts`
        };
  
      } catch (error) {
        console.error('❌ Alert system test failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  
    /**
     * Generate a data signature for detecting changes in sensor data
     */
    generateDataSignature(sensorData) {
      if (!sensorData) return null;

      // Create a simple hash of the sensor data values
      let dataString = '';
      if (Array.isArray(sensorData)) {
        // Handle array of sensor readings
        sensorData.forEach(reading => {
          if (reading && typeof reading === 'object') {
            Object.keys(reading)
              .sort()
              .forEach(key => {
                if (key !== 'timestamp' && key !== 'datetime') {
                  dataString += `${key}:${reading[key]};`;
                }
              });
          }
        });
      } else if (typeof sensorData === 'object') {
        // Handle single sensor reading object
        Object.keys(sensorData)
          .sort()
          .forEach(key => {
            if (key !== 'timestamp' && key !== 'datetime') {
              dataString += `${key}:${sensorData[key]};`;
            }
          });
      }

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }

      return hash.toString(36);
    }

    // Helper methods
    generateDisplayMessage(alert) {
      const paramName = alert.parameter.charAt(0).toUpperCase() + alert.parameter.slice(1);
      const severityText = alert.severity === 'high' ? 'Critical' : 'Warning';
      return `${severityText}: ${paramName} is ${alert.value} (${alert.alertLevel})`;
    }
  
    calculateTimeAgo(timestamp) {
      const now = new Date();
      const alertTime = new Date(timestamp);
      const ageMs = now - alertTime;
  
      if (ageMs < 60000) return 'Just now';
      if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)} min ago`;
      if (ageMs < 86400000) return `${Math.floor(ageMs / 3600000)} hr ago`;
      return `${Math.floor(ageMs / 86400000)} day(s) ago`;
    }
  
    determineActionRequired(alert) {
      if (alert.severity === 'high') return 'immediate';
      if (alert.severity === 'medium') return 'soon';
      return 'monitor';
    }
  
    calculateDisplayPriority(alert) {
      let priority = 0;
      
      // Base priority on severity
      if (alert.severity === 'high') priority += 100;
      else if (alert.severity === 'medium') priority += 50;
      else priority += 10;
  
      // Adjust for parameter importance
      const parameterWeights = {
        ph: 20,
        temperature: 15,
        turbidity: 10,
        salinity: 5
      };
      priority += parameterWeights[alert.parameter.toLowerCase()] || 0;
  
      // Boost recent alerts
      const ageHours = (Date.now() - new Date(alert.timestamp)) / (1000 * 60 * 60);
      if (ageHours < 1) priority += 20;
      else if (ageHours < 6) priority += 10;
  
      return priority;
    }
  }
