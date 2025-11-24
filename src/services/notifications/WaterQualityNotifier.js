import { NotificationTemplates } from './NotificationTemplates';

export class WaterQualityNotifier {
    constructor(notificationService, thresholdManager) {
      this.notificationService = notificationService;
      this.thresholdManager = thresholdManager;
      this.cooldowns = new Map();
      this.defaultCooldown = 5 * 60 * 1000; // 5 minutes
      this.criticalCooldown = 2.5 * 60 * 1000; // 2.5 minutes for critical alerts
      this.borderlineCooldown = 15 * 60 * 1000; // 15 minutes for borderline alerts

      // Connection monitoring
      this.connectionState = true; // Default to true
      this.connectionAttemptCount = 0;
      this.maxConnectionAttempts = 3;
      this.connectionStabilityCooldown = 10 * 60 * 1000; // 10 minutes for connection alerts
      this.lastConnectionAlert = null;

      // Threshold alert state tracking
      this.lastHarmfulState = new Set();
      this.activeAlerts = new Map();
    }
  
    async notifyWaterQualityAlert(parameter, value, alertLevel, options = {}) {
      const {
        forceNotify = false,
        customMessage = null,
        provider = 'default'
      } = options;

      console.log(`🚨 Water quality alert: ${parameter} = ${value} (${alertLevel})`);

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

    /**
     * Enhanced sensor data processing with threshold monitoring and alerts
     */
    async processSensorDataWithThresholdAlerts(sensorData) {
      if (!sensorData || typeof sensorData !== 'object') {
        return { success: false, error: 'Invalid sensor data' };
      }

      const results = {
        notificationsSent: [],
        alerts: [],
        borderlineWarnings: [],
        harmfulStateDetected: false,
        affectedParameters: []
      };

      try {
        // Get current thresholds
        const thresholds = this.thresholdManager.getAllThresholds();
        const harmfulParameters = [];
        const borderlineParameters = [];

        // Analyze each parameter
        for (const [parameter, value] of Object.entries(sensorData)) {
          if (value === null || value === undefined) continue;

          const threshold = thresholds[parameter];
          if (!threshold) continue;

          const numValue = parseFloat(value);
          const analysis = this.analyzeParameterThreshold(parameter, numValue, threshold);

          if (analysis.isExceeded) {
            harmfulParameters.push(parameter);
            results.alerts.push(analysis);
          } else if (analysis.isBorderline) {
            borderlineParameters.push(parameter);
            results.borderlineWarnings.push(analysis);

            // Send borderline alert if cooldown allows
            if (this.canSendBorderlineAlert(parameter)) {
              await this.sendBorderlineAlert(parameter, numValue, analysis);
            }
          }
        }

        // Send harmful state alert if multiple parameters affected or critical breach
        if (harmfulParameters.length > 0) {
          results.harmfulStateDetected = true;
          results.affectedParameters = harmfulParameters;
          await this.sendHarmfulStateAlert(harmfulParameters);
        }

        results.notificationsSent = await this.sendBatchAlerts(results.alerts);

        console.log(`📊 Processed sensor data: ${results.alerts.length} alerts, ${results.borderlineWarnings.length} warnings`);
        return { success: true, ...results };

      } catch (error) {
        console.error('❌ Error processing sensor data with threshold alerts:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Analyze parameter against thresholds
     */
    analyzeParameterThreshold(parameter, value, threshold) {
      const result = {
        parameter,
        value,
        threshold,
        isExceeded: false,
        isBorderline: false,
        severity: 'normal',
        direction: null
      };

      // Define borderline zone (e.g., 10% within threshold)
      const borderlineBuffer = {
        high: threshold.max * 0.1,
        low: threshold.min * 0.1
      };

      if (value > threshold.max) {
        result.isExceeded = true;
        result.severity = value > threshold.max * 1.2 ? 'critical' : 'warning';
        result.direction = 'high';
      } else if (value < threshold.min) {
        result.isExceeded = true;
        result.severity = value < threshold.min * 0.8 ? 'critical' : 'warning';
        result.direction = 'low';
      } else if (value >= (threshold.max - borderlineBuffer.high)) {
        // Approaching high threshold
        result.isBorderline = true;
        result.direction = 'high';
      } else if (value <= (threshold.min + borderlineBuffer.low)) {
        // Approaching low threshold
        result.isBorderline = true;
        result.direction = 'low';
      }

      return result;
    }

    /**
     * Check if borderline alert can be sent
     */
    canSendBorderlineAlert(parameter) {
      const key = `borderline-${parameter}`;
      const lastTime = this.cooldowns.get(key);

      if (!lastTime) return true;
      return Date.now() - lastTime > this.borderlineCooldown;
    }

    /**
     * Send borderline alert
     */
    async sendBorderlineAlert(parameter, value, analysis) {
      try {
        const notification = NotificationTemplates.borderlineAlert(
          parameter.charAt(0).toUpperCase() + parameter.slice(1),
          this.formatParameterValue(parameter, value),
          analysis.direction === 'high' ? analysis.threshold.max : analysis.threshold.min,
          analysis.direction
        );

        const result = await this.notificationService.send(notification, 'push'); // Explicitly use push provider

        if (result.success) {
          // Record notification time with 'borderline' severity
          const key = `borderline-${parameter}`;
          this.cooldowns.set(key, Date.now());
          console.log(`📱 Borderline alert sent: ${parameter} = ${value} (${analysis.direction})`);
          console.log('📲 Borderline push notification delivered to device');
        } else {
          console.error('❌ Failed to send borderline push notification:', result.error);
        }

        return result;
      } catch (error) {
        console.error('❌ Error sending borderline alert:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Send harmful state alert for multiple affected parameters
     */
    async sendHarmfulStateAlert(parameters) {
      try {
        const harmfulParams = parameters.map(p => p.charAt(0).toUpperCase() + p.slice(1));
        const notification = NotificationTemplates.harmfulStateAlert(harmfulParams, parameters.length);

        const result = await this.notificationService.send(notification);

        if (result.success) {
          console.log(`🚨 Harmful state alert sent: ${parameters.join(', ')}`);
        }

        return result;
      } catch (error) {
        console.error('❌ Error sending harmful state alert:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Send batch alerts for exceeded thresholds
     */
    async sendBatchAlerts(alerts) {
      const results = [];

      for (const alert of alerts) {
        if (this.canSendNotification(alert.parameter, alert.severity)) {
          const result = await this.notifyWaterQualityAlert(
            alert.parameter,
            alert.value,
            alert.severity
          );
          results.push({ alert, result });

          if (result.success) {
            this.recordNotification(alert.parameter, alert.severity);
          }
        }
      }

      return results;
    }

    /**
     * Monitor connection state and send alerts for instability
     */
    updateConnectionState(isConnected, options = {}) {
      const previousState = this.connectionState;
      this.connectionState = isConnected;

      // Reset attempt count if connection restored
      if (isConnected && !previousState) {
        this.connectionAttemptCount = 0;
        console.log('✅ Connection restored');
        return { stateChanged: true, from: 'disconnected', to: 'connected' };
      }

      // Track failed attempts when disconnected
      if (!isConnected) {
        this.connectionAttemptCount++;

        const deviceName = options.deviceName || 'DATM';
        const isUnstable = this.connectionAttemptCount >= this.maxConnectionAttempts;

        if (isUnstable && this.canSendConnectionAlert()) {
          this.sendConnectionUnstableAlert(deviceName, this.connectionAttemptCount);
          return { stateChanged: true, from: 'stable', to: 'unstable', attempts: this.connectionAttemptCount };
        } else if (this.connectionAttemptCount > 0 && this.connectionAttemptCount < this.maxConnectionAttempts) {
          console.log(`⚠️ Connection attempt ${this.connectionAttemptCount} failed`);
        }
      }

      return { stateChanged: false, currentState: this.connectionState };
    }

    /**
     * Check if connection alert can be sent
     */
    canSendConnectionAlert() {
      if (!this.lastConnectionAlert) return true;

      const timeSinceLastAlert = Date.now() - this.lastConnectionAlert;
      return timeSinceLastAlert > this.connectionStabilityCooldown;
    }

    /**
     * Send connection unstable alert
     */
    async sendConnectionUnstableAlert(deviceName = 'DATM', attemptCount = 0) {
      try {
        // Send unstable device alert for multiple failures
        const notification = attemptCount >= 3 ?
          NotificationTemplates.deviceUnstable(deviceName) :
          NotificationTemplates.connectionUnstable(deviceName, attemptCount);

        const result = await this.notificationService.send(notification);

        if (result.success) {
          this.lastConnectionAlert = Date.now();
          console.log(`🚨 Connection alert sent: ${deviceName} unstable (${attemptCount} attempts)`);
        }

        return result;
      } catch (error) {
        console.error('❌ Error sending connection alert:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Monitor data fetch attempts and trigger alerts
     */
    async monitorDataFetch(success, options = {}) {
      const deviceName = options.deviceName || 'DATM';

      if (!success) {
        // Update connection state
        this.updateConnectionState(false, options);

        if (options.error) {
          console.warn(`⚠️ Data fetch failed for ${deviceName}: ${options.error}`);
        }

        return { success: false, reason: 'fetch_failed' };
      } else {
        // Reset connection state on successful fetch
        this.updateConnectionState(true, options);
        return { success: true };
      }
    }

    /**
     * Get current monitoring status
     */
    getMonitoringStatus() {
      return {
        connectionState: this.connectionState,
        connectionAttempts: this.connectionAttemptCount,
        maxAttempts: this.maxConnectionAttempts,
        lastConnectionAlert: this.lastConnectionAlert,
        activeAlerts: Array.from(this.activeAlerts.entries()),
        cooldownStatus: this.getCooldownStatus()
      };
    }

    /**
     * Reset monitoring state (for testing or manual reset)
     */
    resetMonitoringState() {
      this.connectionState = true;
      this.connectionAttemptCount = 0;
      this.lastConnectionAlert = null;
      this.lastHarmfulState.clear();
      this.activeAlerts.clear();
      console.log('🔄 Monitoring state reset');
    }
  }
