// src/services/WaterQualityNotificationService.js
import { notificationManager } from './notifications/NotificationManager';
import { NotificationTemplates } from './notifications/NotificationTemplates';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service for handling water quality specific notifications
 * Integrates with your existing data flow and alert system
 */
class WaterQualityNotificationService {
  constructor() {
    this.lastNotificationTimes = new Map();
    this.notificationCooldown = 5 * 60 * 1000; // 5 minutes cooldown
    this.thresholds = {
      pH: { min: 6.5, max: 8.5, critical: { min: 6.0, max: 9.0 } },
      temperature: { min: 26, max: 30, critical: { min: 20, max: 35 } },
      turbidity: { max: 50, critical: { max: 100 } },
      salinity: { max: 5, critical: { max: 10 } },
      tds: { max: 500, critical: { max: 1000 } }
    };
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return { success: true };

    try {
      // Load saved notification times
      const savedTimes = await AsyncStorage.getItem('notification_cooldowns');
      if (savedTimes) {
        const parsed = JSON.parse(savedTimes);
        this.lastNotificationTimes = new Map(Object.entries(parsed));
      }

      this.isInitialized = true;
      console.log('✅ WaterQualityNotificationService initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Error initializing WaterQualityNotificationService:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save notification cooldown times
   */
  async saveNotificationTimes() {
    try {
      const timesObject = Object.fromEntries(this.lastNotificationTimes);
      await AsyncStorage.setItem('notification_cooldowns', JSON.stringify(timesObject));
    } catch (error) {
      console.error('Error saving notification times:', error);
    }
  }

  /**
   * Check if enough time has passed since last notification for a parameter
   */
  canSendNotification(parameter, severity = 'normal') {
    const key = `${parameter}-${severity}`;
    const lastTime = this.lastNotificationTimes.get(key);
    
    if (!lastTime) return true;
    
    const cooldown = severity === 'critical' ? this.notificationCooldown / 2 : this.notificationCooldown;
    return Date.now() - lastTime > cooldown;
  }

  /**
   * Record that a notification was sent
   */
  recordNotification(parameter, severity = 'normal') {
    const key = `${parameter}-${severity}`;
    this.lastNotificationTimes.set(key, Date.now());
    this.saveNotificationTimes();
  }

  /**
   * Determine alert level based on parameter value
   */
  getAlertLevel(parameter, value) {
    const threshold = this.thresholds[parameter];
    if (!threshold) return 'normal';

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Check critical thresholds first
    if (threshold.critical) {
      if (threshold.critical.min && numValue < threshold.critical.min) return 'critical';
      if (threshold.critical.max && numValue > threshold.critical.max) return 'critical';
    }

    // Check warning thresholds
    if (threshold.min && numValue < threshold.min) return 'warning';
    if (threshold.max && numValue > threshold.max) return 'warning';

    return 'normal';
  }

  /**
   * Process sensor data and send notifications if needed
   */
  async processSensorData(sensorData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!sensorData || typeof sensorData !== 'object') {
      return { success: false, error: 'Invalid sensor data' };
    }

    const notificationsSent = [];
    const errors = [];

    try {
      // Process each parameter
      for (const [parameter, value] of Object.entries(sensorData)) {
        if (value === null || value === undefined) continue;

        const alertLevel = this.getAlertLevel(parameter, value);
        
        if (alertLevel !== 'normal') {
          const canSend = this.canSendNotification(parameter, alertLevel);
          
          if (canSend) {
            try {
              const result = await this.sendWaterQualityAlert(parameter, value, alertLevel);
              if (result.success) {
                this.recordNotification(parameter, alertLevel);
                notificationsSent.push({
                  parameter,
                  value,
                  alertLevel,
                  notificationId: result.notificationId
                });
              } else {
                errors.push({
                  parameter,
                  error: result.error
                });
              }
            } catch (error) {
              errors.push({
                parameter,
                error: error.message
              });
            }
          }
        }
      }

      return {
        success: true,
        notificationsSent,
        errors
      };

    } catch (error) {
      console.error('❌ Error processing sensor data for notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send water quality alert notification
   */
  async sendWaterQualityAlert(parameter, value, alertLevel) {
    try {
      const formattedValue = this.formatParameterValue(parameter, value);
      const status = alertLevel === 'critical' ? 'critical' : 'warning';
      
      const notification = NotificationTemplates.waterQualityAlert(
        parameter.charAt(0).toUpperCase() + parameter.slice(1),
        formattedValue,
        status
      );

      const result = await notificationManager.sendLocalNotification(notification);
      
      if (result.success) {
        console.log(`📱 Water quality alert sent: ${parameter} = ${formattedValue} (${alertLevel})`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending water quality alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format parameter value for display
   */
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
      } else {
        notification = NotificationTemplates.systemStatus(status, additionalInfo.message || 'System status updated');
      }

      const result = await notificationManager.sendLocalNotification(notification);
      
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

      const result = await notificationManager.scheduleNotification(notification, trigger);
      
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

      const result = await notificationManager.sendLocalNotification(notification);
      
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

      const result = await notificationManager.sendLocalNotification(notification);
      
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

            const result = await notificationManager.sendLocalNotification(notification);
            if (result.success) {
              this.recordNotification(`${parameter}_forecast`, 'warning');
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

  /**
   * Update notification thresholds
   */
  updateThresholds(newThresholds) {
    try {
      this.thresholds = {
        ...this.thresholds,
        ...newThresholds
      };
      
      console.log('✅ Notification thresholds updated:', this.thresholds);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating thresholds:', error);
      return { success: false, error: error.message };
    }
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
export default waterQualityNotificationService;
