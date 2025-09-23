import { NotificationTemplates } from './NotificationTemplates';

export class WaterQualityNotifier {
    constructor(notificationService, thresholdManager) {
      this.notificationService = notificationService;
      this.thresholdManager = thresholdManager;
      this.cooldowns = new Map();
      this.defaultCooldown = 5 * 60 * 1000; // 5 minutes
      this.criticalCooldown = 2.5 * 60 * 1000; // 2.5 minutes for critical alerts
    }
  
    async notifyWaterQualityAlert(parameter, value, alertLevel, options = {}) {
      const {
        forceNotify = false,
        customMessage = null,
        provider = 'default'
      } = options;
  
      // Check cooldown unless forced
      if (!forceNotify && !this.canSendNotification(parameter, alertLevel)) {
        console.log(`⏰ Notification cooldown active for ${parameter}-${alertLevel}`);
        return { success: false, reason: 'cooldown_active' };
      }
  
      try {
        // Create notification using template
        const notification = customMessage ? 
          this.createCustomNotification(parameter, value, alertLevel, customMessage) :
          NotificationTemplates.waterQualityAlert(
            parameter.charAt(0).toUpperCase() + parameter.slice(1),
            this.formatParameterValue(parameter, value),
            alertLevel
          );
  
        // Send notification
        const result = await this.notificationService.send(notification, provider);
  
        if (result.success) {
          // Record notification time
          this.recordNotification(parameter, alertLevel);
          console.log(`📱 Water quality alert sent: ${parameter} = ${value} (${alertLevel})`);
        }
  
        return result;
  
      } catch (error) {
        console.error('❌ Error sending water quality alert:', error);
        return { success: false, error: error.message };
      }
    }
  
    async notifyDeviceStatus(deviceName, status, additionalInfo = {}) {
      try {
        let notification;
  
        switch (status) {
          case 'offline':
            notification = NotificationTemplates.deviceOffline(
              deviceName, 
              additionalInfo.lastSeen || 'Unknown'
            );
            break;
          case 'online':
            notification = NotificationTemplates.deviceOnline(deviceName);
            break;
          case 'low_battery':
            notification = NotificationTemplates.lowBattery(
              deviceName, 
              additionalInfo.batteryLevel || 'Unknown'
            );
            break;
          default:
            notification = NotificationTemplates.systemStatus(
              status, 
              additionalInfo.message || `Device ${deviceName} status: ${status}`
            );
        }
  
        const result = await this.notificationService.send(notification);
        
        if (result.success) {
          console.log(`📱 Device status notification sent: ${deviceName} - ${status}`);
        }
  
        return result;
  
      } catch (error) {
        console.error('❌ Error sending device status notification:', error);
        return { success: false, error: error.message };
      }
    }
  
    async notifyForecastAlert(parameter, prediction, timeframe) {
      try {
        const notification = NotificationTemplates.forecastAlert(
          parameter.charAt(0).toUpperCase() + parameter.slice(1),
          prediction,
          timeframe
        );
  
        const result = await this.notificationService.send(notification);
        
        if (result.success) {
          console.log(`📱 Forecast alert sent: ${parameter} prediction`);
        }
  
        return result;
  
      } catch (error) {
        console.error('❌ Error sending forecast alert:', error);
        return { success: false, error: error.message };
      }
    }
  
    async notifyQualityReport(wqi, rating) {
      try {
        const notification = NotificationTemplates.qualityReport(wqi, rating);
        const result = await this.notificationService.send(notification);
        
        if (result.success) {
          console.log(`📱 Quality report notification sent: WQI ${wqi}`);
        }
  
        return result;
  
      } catch (error) {
        console.error('❌ Error sending quality report:', error);
        return { success: false, error: error.message };
      }
    }
  
    canSendNotification(parameter, severity) {
      const key = `${parameter}-${severity}`;
      const lastTime = this.cooldowns.get(key);
      
      if (!lastTime) return true;
      
      const cooldownPeriod = severity === 'critical' ? 
        this.criticalCooldown : 
        this.defaultCooldown;
        
      return Date.now() - lastTime > cooldownPeriod;
    }
  
    recordNotification(parameter, severity) {
      const key = `${parameter}-${severity}`;
      this.cooldowns.set(key, Date.now());
    }
  
    createCustomNotification(parameter, value, alertLevel, message) {
      const severity = alertLevel === 'critical' ? 'Critical' : 'Warning';
      const emoji = alertLevel === 'critical' ? '🚨' : '⚠️';
      
      return {
        title: `${emoji} ${severity} Alert`,
        body: message,
        data: {
          type: 'PureFlow Alert',
          parameter: parameter.toLowerCase(),
          value,
          status: alertLevel,
          custom: true,
          timestamp: new Date().toISOString(),
          category: 'alerts'
        },
        categoryId: 'alerts',
        priority: alertLevel === 'critical' ? 'high' : 'normal'
      };
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
        default:
          return numValue.toFixed(2);
      }
    }
  
    clearCooldowns() {
      this.cooldowns.clear();
      console.log('🧹 Notification cooldowns cleared');
    }
  
    setCooldownPeriod(defaultMs, criticalMs = null) {
      this.defaultCooldown = defaultMs;
      this.criticalCooldown = criticalMs || Math.floor(defaultMs / 2);
    }
  
    getCooldownStatus() {
      const status = {};
      for (const [key, timestamp] of this.cooldowns.entries()) {
        const [parameter, severity] = key.split('-');
        const cooldownPeriod = severity === 'critical' ? 
          this.criticalCooldown : 
          this.defaultCooldown;
        const remaining = Math.max(0, cooldownPeriod - (Date.now() - timestamp));
        
        status[key] = {
          parameter,
          severity,
          remainingMs: remaining,
          canSend: remaining === 0
        };
      }
      return status;
    }
  }