import { addAlertToFirestore, getRecentAlerts } from '../firebase/firestore';
import { getAlertsFromSensorData } from '../../utils/alertLogicHandler';
import { performanceMonitor } from '../../utils/performanceMonitor';

/**
 * Enhanced Alert Management Service
 * Handles alert generation, deduplication, and Firebase synchronization
 */
class AlertManager {
  constructor() {
    this.activeAlerts = new Map(); // Map of alert signatures to alert objects
    this.alertHistory = new Set(); // Set of processed data signatures to prevent duplicates
    this.lastProcessedTimestamp = null;
    this.pendingFirebaseAlerts = [];
    this.alertIdCounter = 0; // Counter to ensure unique IDs
  }

  /**
   * Generate a unique signature for sensor data to prevent duplicate processing
   * @param {Array} sensorData - Array of sensor data points
   * @returns {string} Unique signature for the dataset
   */
  generateDataSignature(sensorData) {
    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      return 'empty-data';
    }

    // Use the latest data point's timestamp and key values to create signature
    const latest = sensorData[sensorData.length - 1];
    const keyValues = {
      timestamp: latest.timestamp || latest.createdAt || Date.now(),
      ph: latest.ph,
      temperature: latest.temperature,
      tds: latest.tds,
      salinity: latest.salinity,
      isRaining: latest.isRaining,
    };

    return JSON.stringify(keyValues);
  }

  /**
   * Generate a unique signature for an alert to prevent duplicates
   * @param {Object} alert - Alert object
   * @returns {string} Unique signature for the alert
   */
  generateAlertSignature(alert) {
    return `${alert.parameter}-${alert.type}-${alert.title}-${Math.round(alert.value * 100) / 100}`;
  }

  /**
   * Process sensor data and generate alerts with deduplication
   * @param {Array} sensorData - Array of sensor data points
   * @returns {Promise<Object>} Processing result with alerts and metadata
   */
  async processAlertsFromSensorData(sensorData) {
    return await performanceMonitor.measureAsync('alertManager.processAlerts', async () => {
      try {
        // Generate signature for current data
        const dataSignature = this.generateDataSignature(sensorData);
        
        // Check if we've already processed this exact dataset
        if (this.alertHistory.has(dataSignature)) {
          console.log('📦 Skipping alert processing - data already processed');
          return {
            alerts: Array.from(this.activeAlerts.values()),
            newAlerts: [],
            skipped: true,
            reason: 'duplicate-data'
          };
        }

        // Generate alerts from sensor data
        const generatedAlerts = getAlertsFromSensorData(sensorData);
        console.log(`🔍 Generated ${generatedAlerts.length} potential alerts from sensor data`);

        // Process each generated alert
        const newAlerts = [];
        const currentTimestamp = Date.now();

        for (const alert of generatedAlerts) {
          const alertSignature = this.generateAlertSignature(alert);
          
          // Check if this alert already exists
          const existingAlert = this.activeAlerts.get(alertSignature);
          
          if (existingAlert) {
            // Update existing alert timestamp but don't create duplicate
            existingAlert.lastSeen = currentTimestamp;
            existingAlert.occurrenceCount = (existingAlert.occurrenceCount || 1) + 1;
            console.log(`🔄 Updated existing alert: ${alert.title}`);
          } else {
            // Create new alert with additional metadata and guaranteed unique ID
            this.alertIdCounter++;
            const enhancedAlert = {
              ...alert,
              id: `alert_${Date.now()}_${this.alertIdCounter}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              timestamp: currentTimestamp,
              lastSeen: currentTimestamp,
              occurrenceCount: 1,
              severity: this.calculateSeverity(alert),
              dataSignature,
            };

            this.activeAlerts.set(alertSignature, enhancedAlert);
            newAlerts.push(enhancedAlert);
            
            // Queue new alert for Firebase sync (check for duplicates)
            const isDuplicate = this.pendingFirebaseAlerts.some(existingAlert => existingAlert.id === enhancedAlert.id);
            if (!isDuplicate) {
              this.pendingFirebaseAlerts.push(enhancedAlert);
            }
            
            console.log(`🚨 New alert created: ${alert.title}`);
          }
        }

        // Clean up resolved alerts (alerts that are no longer being generated)
        const currentAlertSignatures = new Set(generatedAlerts.map(this.generateAlertSignature.bind(this)));
        const resolvedAlerts = [];

        for (const [signature, alert] of this.activeAlerts.entries()) {
          if (!currentAlertSignatures.has(signature)) {
            // Alert is no longer active, mark as resolved
            if (currentTimestamp - alert.lastSeen > 60000) { // 1 minute grace period
              this.activeAlerts.delete(signature);
              resolvedAlerts.push({ ...alert, resolvedAt: new Date().toISOString() });
              console.log(`✅ Alert resolved: ${alert.title}`);
            }
          }
        }

        // Add data signature to history
        this.alertHistory.add(dataSignature);
        
        // Clean up old history entries (keep last 100)
        if (this.alertHistory.size > 100) {
          const historyArray = Array.from(this.alertHistory);
          this.alertHistory = new Set(historyArray.slice(-100));
        }

        // Queue new alerts for Firebase
        if (newAlerts.length > 0) {
          this.pendingFirebaseAlerts.push(...newAlerts);
        }

        this.lastProcessedTimestamp = currentTimestamp;

        return {
          alerts: Array.from(this.activeAlerts.values()),
          newAlerts,
          resolvedAlerts,
          skipped: false,
          dataSignature,
          processedAt: currentTimestamp
        };

      } catch (error) {
        console.error('❌ Error processing alerts:', error);
        throw error;
      }
    });
  }

  /**
   * Calculate alert severity based on alert type and value deviation
   * @param {Object} alert - Alert object
   * @returns {string} Severity level
   */
  calculateSeverity(alert) {
    if (alert.type === 'error') return 'high';
    if (alert.type === 'warning') return 'medium';
    if (alert.type === 'info') return 'low';
    return 'low';
  }

  /**
   * Sync pending alerts to Firebase
   * @returns {Promise<Object>} Sync result
   */
  async syncAlertsToFirebase() {
    if (this.pendingFirebaseAlerts.length === 0) {
      return { synced: 0, errors: 0 };
    }

    return await performanceMonitor.measureAsync('alertManager.syncToFirebase', async () => {
      const alertsToSync = [...this.pendingFirebaseAlerts];
      this.pendingFirebaseAlerts = [];

      let synced = 0;
      let errors = 0;

      try {
        // Batch sync alerts to Firebase
        await addAlertToFirestore(alertsToSync);
        synced = alertsToSync.length;
        console.log(`✅ Synced ${synced} alerts to Firebase`);
      } catch (error) {
        console.error('❌ Error syncing alerts to Firebase:', error);
        // Put failed alerts back in queue for retry
        this.pendingFirebaseAlerts.unshift(...alertsToSync);
        errors = alertsToSync.length;
      }

      return { synced, errors, total: alertsToSync.length };
    });
  }

  /**
   * Get current active alerts
   * @returns {Array} Array of active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values()).sort((a, b) => {
      // Sort by severity (high -> medium -> low) then by timestamp (newest first)
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });
  }

  /**
   * Get alerts for homepage display (brief summary)
   * @param {number} limit - Maximum number of alerts to return
   * @returns {Array} Array of alerts for homepage
   */
  getHomepageAlerts(limit = 3) {
    return this.getActiveAlerts()
      .slice(0, limit)
      .map(alert => ({
        ...alert,
        displayMessage: this.getBriefMessage(alert),
      }));
  }

  /**
   * Get brief message for homepage display
   * @param {Object} alert - Alert object
   * @returns {string} Brief message
   */
  getBriefMessage(alert) {
    const value = typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value;
    return `${alert.parameter.toUpperCase()}: ${value}`;
  }

  /**
   * Get alerts for notifications tab (full details)
   * @returns {Array} Array of alerts with full details
   */
  getNotificationAlerts() {
    return this.getActiveAlerts().map(alert => ({
      ...alert,
      // Format for notification display
      message: alert.message || `${alert.title}: ${alert.value}`,
      timestamp: { seconds: Math.floor(alert.timestamp / 1000) },
    }));
  }

  /**
   * Clear all alerts and history
   */
  clearAll() {
    this.activeAlerts.clear();
    this.alertHistory.clear();
    this.pendingFirebaseAlerts = [];
    this.lastProcessedTimestamp = null;
    console.log('🧹 Alert manager cleared');
  }

  /**
   * Get statistics about alert processing
   * @returns {Object} Alert statistics
   */
  getStatistics() {
    return {
      activeAlerts: this.activeAlerts.size,
      historySize: this.alertHistory.size,
      pendingFirebaseSync: this.pendingFirebaseAlerts.length,
      lastProcessed: this.lastProcessedTimestamp,
      severityBreakdown: this.getSeverityBreakdown(),
    };
  }

  /**
   * Get breakdown of alerts by severity
   * @returns {Object} Severity breakdown
   */
  getSeverityBreakdown() {
    const breakdown = { high: 0, medium: 0, low: 0 };
    for (const alert of this.activeAlerts.values()) {
      breakdown[alert.severity] = (breakdown[alert.severity] || 0) + 1;
    }
    return breakdown;
  }
}

// Export singleton instance
export const alertManager = new AlertManager();
export default alertManager;
