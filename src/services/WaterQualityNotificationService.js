import { NotificationTemplates } from './notifications/NotificationTemplates';

/**
 * Legacy WaterQualityNotificationService Adapter
 * This class is now a lightweight adapter that delegates to the new facade-based architecture.
 */
class WaterQualityNotificationService {
  constructor() {
    this.alertFacade = null;
    this.waterQualityNotifier = null;
    this.thresholdManager = null;
    this.notificationService = null;

    // Deduplication settings
    this.recentNotifications = new Map();
    this.deduplicationWindow = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = null;

    // Start cleanup timer
    this.startCleanupTimer();

    console.log('🔧 WaterQualityNotificationService constructed');
  }

  postInitialize(alertFacade, waterQualityNotifier, thresholdManager, notificationService, scheduledNotificationManager = null) {
    this.alertFacade = alertFacade;
    this.waterQualityNotifier = waterQualityNotifier;
    this.thresholdManager = thresholdManager;
    this.notificationService = notificationService;
    this.scheduledNotificationManager = scheduledNotificationManager;
    console.log('✅ WaterQualityNotificationService post-initialized');
  }


  async processSensorData(sensorData) {
    // This method now delegates to the facade and adapts the response.
    console.log('ℹ️ Delegating sensor data processing to AlertManagementFacade...');
    const result = await this.alertFacade.processSensorData(sensorData);
    return {
      success: !result.errors || result.errors.length === 0,
      notificationsSent: result.notificationsSent || 0,
      errors: result.errors || [],
    };
  }

  async sendWaterQualityAlert(parameter, value, alertLevel) {
    // Delegate directly to the new WaterQualityNotifier service
    return this.waterQualityNotifier.notifyWaterQualityAlert(parameter, value, alertLevel);
  }


  /**
   * Check if a notification can be sent (deduplication check)
   */
  canSendNotification(notificationKey, severity = 'warning') {
    const recentNotifications = this.recentNotifications.get(notificationKey) || [];
    const now = Date.now();

    // Remove expired notifications
    const validNotifications = recentNotifications.filter(
      notification => (now - notification.timestamp) < this.deduplicationWindow
    );

    // If we have remaining notifications, check if this is a duplicate
    for (const notification of validNotifications) {
      if (notification.severity === severity) {
        return false; // Duplicate found
      }
    }

    // Update the list with cleaned notifications
    this.recentNotifications.set(notificationKey, validNotifications);
    return true; // Can send
  }

  /**
   * Record a sent notification for deduplication
   */
  recordNotification(notificationKey, severity = 'warning') {
    const recentNotifications = this.recentNotifications.get(notificationKey) || [];
    recentNotifications.push({
      timestamp: Date.now(),
      severity: severity
    });

    // Keep the list manageable
    if (recentNotifications.length > 10) {
      recentNotifications.shift();
    }

    this.recentNotifications.set(notificationKey, recentNotifications);
  }

  /**
   * Generate a hash from notification content for deduplication
   */
  generateNotificationHash(notification) {
    const content = `${notification.title || ''}:${notification.body || ''}:${JSON.stringify(notification.data || {})}`;
    return this.simpleHash(content);
  }

  /**
   * Simple hash function for notification content
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Start periodic cleanup of old notification records
   */
  startCleanupTimer() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldNotifications();
    }, 60000); // Run cleanup every minute
  }

  /**
   * Clean up old notification records
   */
  cleanupOldNotifications() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, notifications] of this.recentNotifications.entries()) {
      const validNotifications = notifications.filter(
        notification => (now - notification.timestamp) < this.deduplicationWindow
      );

      if (validNotifications.length === 0) {
        keysToDelete.push(key);
      } else {
        this.recentNotifications.set(key, validNotifications);
      }
    }

    keysToDelete.forEach(key => this.recentNotifications.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} old notification records`);
    }
  }

  /**
   * Send device status notification - DISABLED
   * Device status changes (online/offline/low battery) will not trigger push notifications
   */
  async sendDeviceStatusNotification(deviceName, status, additionalInfo = {}) {
    try {
      console.log(`📱 Device status change detected: ${deviceName} - ${status} (notification disabled)`);

      // Device status notifications are disabled - just return success without sending
      return {
        success: true,
        message: 'Device status notification disabled',
        status: status,
        deviceName: deviceName
      };
    } catch (error) {
      console.error('❌ Error processing device status notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule maintenance reminder - CHANGED TO MONTHLY
   * Individual maintenance reminders now handled by monthly scheduled notifications
   */
  async scheduleMaintenanceReminder(task, dueDate, scheduleTime = null) {
    console.log(`🔧 Maintenance reminder request for "${task}" scheduled for ${dueDate}`);
    console.log(`📅 Note: Maintenance reminders now sent monthly on the 28th by ScheduledNotificationManager`);

    // Return success without sending individual notifications (now monthly)
    return {
      success: true,
      message: 'Maintenance reminders now scheduled monthly',
      task: task,
      dueDate: dueDate
    };
  }

  /**
   * Send calibration reminder - CHANGED TO MONTHLY
   * Individual calibration reminders now handled by monthly scheduled notifications
   */
  async sendCalibrationReminder(parameter, lastCalibrated) {
    console.log(`🔧 Calibration reminder request for parameter "${parameter}" (last calibrated: ${lastCalibrated})`);
    console.log(`📅 Note: Calibration reminders now sent monthly on the 28th by ScheduledNotificationManager`);

    // Return success without sending individual notifications (now monthly)
    return {
      success: true,
      message: 'Calibration reminders now scheduled monthly',
      parameter: parameter,
      lastCalibrated: lastCalibrated
    };
  }

  /**
   * Send data sync notification
   */
  async sendDataSyncNotification(success, data = {}) {
    try {
      let notification;
      let severity = success ? 'info' : 'warning';

      if (success) {
        const recordCount = data.recordCount || 0;
        notification = NotificationTemplates.dataSyncComplete(recordCount);
      } else {
        const error = data.error || 'Unknown error';
        notification = NotificationTemplates.dataSyncFailed(error);
      }

      // Check for duplicate data sync notifications
      const notificationKey = `data_sync_${success ? 'success' : 'failed'}`;
      if (!this.canSendNotification(notificationKey, severity)) {
        console.log(`⏰ Skipping duplicate data sync notification: ${success ? 'success' : 'failed'}`);
        return { success: false, reason: 'duplicate' };
      }

      const result = await this.notificationService.send(notification, 'local');

      if (result.success) {
        // Record the notification to prevent duplicates
        this.recordNotification(notificationKey, severity);
        console.log(`📱 Data sync notification sent: ${success ? 'success' : 'failed'}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending data sync notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process forecast data - DISABLED
   * Forecast alerts will not trigger push notifications
   */
  async processForecastData(forecastData) {
    if (!forecastData || typeof forecastData !== 'object') {
      return { success: false, error: 'Invalid forecast data' };
    }

    try {
      // Process forecast data but don't send notifications
      let breachCount = 0;
      const alertedParameters = [];

      for (const [parameter, prediction] of Object.entries(forecastData)) {
        if (!prediction || typeof prediction !== 'object') continue;

        // Check if forecast predicts breach (for logging only)
        if (prediction.breachPredicted) {
          console.log(`📊 Forecast breach detected for ${parameter}: ${prediction.value} (notification disabled)`);
          breachCount++;
          alertedParameters.push(parameter);
        }
      }

      console.log(`📊 Forecast processing complete: ${breachCount} breaches detected, notifications disabled`);

      return {
        success: true,
        breachCount,
        alertedParameters,
        message: 'Forecast processing completed but notifications disabled'
      };

    } catch (error) {
      console.error('❌ Error processing forecast data:', error);
      return { success: false, error: error.message };
    }
  }

  updateThresholds(newThresholds) {
    // Delegate to the centralized ThresholdManager
    console.log('ℹ️ Updating thresholds via ThresholdManager...');
    for (const [param, threshold] of Object.entries(newThresholds)) {
      this.thresholdManager.updateThreshold(param, threshold);
    }
    return { success: true };
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      thresholds: { ...this.thresholds },
      cooldownPeriod: this.notificationCooldown,
      isInitialized: this.isInitialized,
      lastNotificationCount: this.lastNotificationTimes.size
    };
  }

  /**
   * Clear all cooldowns (for testing or reset)
   */
  async clearCooldowns() {
    try {
      this.lastNotificationTimes.clear();
      await AsyncStorage.removeItem('notification_cooldowns');
      console.log('🧹 All notification cooldowns cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing cooldowns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitor data fetch attempts and trigger connection alerts
   */
  async monitorDataFetch(success, options = {}) {
    // Delegate to the WaterQualityNotifier
    return this.waterQualityNotifier.monitorDataFetch(success, options);
  }

  /**
   * Test notification system
   */
  async testNotifications() {
    try {
      const testData = {
        pH: 9.5, // Critical high
        temperature: 36, // Warning high
        turbidity: 75, // Warning high
        salinity: 2.5 // Normal
      };

      console.log('🧪 Testing notification system with data:', testData);
      const result = await this.processSensorData(testData);

      return {
        success: true,
        testData,
        result
      };
    } catch (error) {
      console.error('❌ Error testing notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

const waterQualityNotificationService = new WaterQualityNotificationService();
export { waterQualityNotificationService };
export default waterQualityNotificationService;
