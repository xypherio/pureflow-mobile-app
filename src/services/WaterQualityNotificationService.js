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
    console.log('🔧 WaterQualityNotificationService constructed');
  }

  postInitialize(alertFacade, waterQualityNotifier, thresholdManager, notificationService) {
    this.alertFacade = alertFacade;
    this.waterQualityNotifier = waterQualityNotifier;
    this.thresholdManager = thresholdManager;
    this.notificationService = notificationService;
    console.log('✅ WaterQualityNotificationService post-initialized');
  }


  async processSensorData(sensorData) {
    // The new AlertManagementFacade automatically processes data and triggers notifications.
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
   * Send device status notification
   */
  async sendDeviceStatusNotification(deviceName, status, additionalInfo = {}) {
    try {
      let notification;

      if (status === 'offline') {
        const lastSeen = additionalInfo.lastSeen || 'Unknown';
        notification = NotificationTemplates.deviceOffline(deviceName, lastSeen);
      } else if (status === 'online') {
        notification = NotificationTemplates.deviceOnline(deviceName);
      } else if (status === 'low_battery') {
        const batteryLevel = additionalInfo.batteryLevel || 'Unknown';
        notification = NotificationTemplates.lowBattery(deviceName, batteryLevel);
      } else if (status === 'system_alert') {
        // Special handling for system alerts
        notification = NotificationTemplates.systemStatus(
          'system_alert',
          additionalInfo.message || 'System alert triggered'
        );
      } else {
        // Default to warning status for unknown status types
        notification = NotificationTemplates.systemStatus(
          'warning',
          additionalInfo.message || `System status: ${status}`
        );
      }

      const result = await this.notificationService.send(notification, 'local');
      
      if (result.success) {
        console.log(`📱 Device status notification sent: ${deviceName} - ${status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending device status notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule maintenance reminder
   */
  async scheduleMaintenanceReminder(task, dueDate, scheduleTime = null) {
    try {
      const notification = NotificationTemplates.maintenanceReminder(task, dueDate);
      
      let trigger = null;
      if (scheduleTime) {
        // Schedule for specific time
        trigger = {
          date: new Date(scheduleTime)
        };
      } else {
        // Schedule for 1 day before due date
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        reminderDate.setHours(9, 0, 0, 0); // 9 AM
        
        trigger = {
          date: reminderDate
        };
      }

      const result = await this.notificationService.schedule(notification, trigger);
      
      if (result.success) {
        console.log(`⏰ Maintenance reminder scheduled: ${task} for ${dueDate}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling maintenance reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send calibration reminder
   */
  async sendCalibrationReminder(parameter, lastCalibrated) {
    try {
      const notification = NotificationTemplates.calibrationNeeded(
        parameter.charAt(0).toUpperCase() + parameter.slice(1),
        lastCalibrated
      );

      const result = await this.notificationService.send(notification, 'local');
      
      if (result.success) {
        console.log(`📱 Calibration reminder sent: ${parameter}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending calibration reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send data sync notification
   */
  async sendDataSyncNotification(success, data = {}) {
    try {
      let notification;

      if (success) {
        const recordCount = data.recordCount || 0;
        notification = NotificationTemplates.dataSyncComplete(recordCount);
      } else {
        const error = data.error || 'Unknown error';
        notification = NotificationTemplates.dataSyncFailed(error);
      }

      const result = await this.notificationService.send(notification, 'local');
      
      if (result.success) {
        console.log(`📱 Data sync notification sent: ${success ? 'success' : 'failed'}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending data sync notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process forecast data and send predictions
   */
  async processForecastData(forecastData) {
    if (!forecastData || typeof forecastData !== 'object') {
      return { success: false, error: 'Invalid forecast data' };
    }

    const notifications = [];

    try {
      for (const [parameter, prediction] of Object.entries(forecastData)) {
        if (!prediction || typeof prediction !== 'object') continue;

        // Check if forecast predicts breach
        if (prediction.breachPredicted) {
          const canSend = this.canSendNotification(`${parameter}_forecast`, 'warning');
          
          if (canSend) {
            const notification = {
              title: `Forecast Alert: ${parameter}`,
              body: `${parameter} is predicted to breach safe levels. ${prediction.message || 'Take preventive action.'}`,
              data: {
                type: 'forecast_alert',
                parameter,
                prediction: prediction.value,
                category: 'alerts'
              },
              categoryId: 'alerts',
              priority: 'high'
            };

            const result = await this.notificationService.send(notification, 'local');
            if (result.success) {
              this.alertFacade.recordNotificationSent(`${parameter}_forecast`, 'warning');
              notifications.push({
                parameter,
                type: 'forecast',
                notificationId: result.notificationId
              });
            }
          }
        }
      }

      return {
        success: true,
        notifications
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
