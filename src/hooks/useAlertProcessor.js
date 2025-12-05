import { useCallback, useMemo, useState, useEffect } from 'react';
import { getWaterQualityThresholdsFromSettings } from '../constants/thresholds';
import { notificationManager } from '../services/notifications/NotificationManager';
import { fcmService } from '../services/fcmService';

// Static imports for alert messages (kept for now, will be lazy loaded later)
import phMessages from '../constants/alertMessages/ph.json';
import temperatureMessages from '../constants/alertMessages/temperature.json';
import turbidityMessages from '../constants/alertMessages/turbidity.json';
import salinityMessages from '../constants/alertMessages/salinity.json';
import weatherMessages from '../constants/alertMessages/weather.json';

/**
 * Custom hook to handle alert processing and generation logic
 * Separated from AlertsCard to reduce component complexity and improve reusability
 */
export function useAlertProcessor() {
  const [thresholds, setThresholds] = useState({});

  useEffect(() => {
    const loadThresholds = async () => {
      const loadedThresholds = await getWaterQualityThresholdsFromSettings();
      setThresholds(loadedThresholds);
    };
    loadThresholds();
  }, []);

  // Message cache for random selection
  const messageCache = useMemo(() => ({
    ph: { low: phMessages.low, high: phMessages.high },
    temperature: { low: temperatureMessages.low, high: temperatureMessages.high },
    turbidity: { low: turbidityMessages.low, high: turbidityMessages.high },
    salinity: { low: salinityMessages.low, high: salinityMessages.high },
    weather: { low: weatherMessages.low, high: weatherMessages.high },
  }), []);

  // Helper function to map severity to type
  const mapSeverityToType = useCallback((severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }, []);

  // Helper function to evaluate parameter value against thresholds
  const evaluateParameter = useCallback((parameter, value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    const paramKey = parameter.toLowerCase();
    const threshold = thresholds[parameter] || thresholds[paramKey];

    if (!threshold) {
      return null;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return null;
    }

    // Check critical thresholds (if they exist)
    if (threshold.critical) {
      if (threshold.critical.min && numValue < threshold.critical.min) {
        return { type: 'error', level: 'critical', alertType: 'low' };
      }
      if (threshold.critical.max && numValue > threshold.critical.max) {
        return { type: 'error', level: 'critical', alertType: 'high' };
      }
    }

    // Check normal thresholds
    if (threshold.min && numValue < threshold.min) {
      return { type: 'warning', level: 'warning', alertType: 'low' };
    }
    if (threshold.max && numValue > threshold.max) {
      return { type: 'warning', level: 'warning', alertType: 'high' };
    }

    return { type: 'success', level: 'normal' };
  }, [thresholds]);

  // Generate alerts from realtimeData if alerts prop is empty
  const generateAlertsFromRealtimeData = useCallback((realtimeData) => {
    if (!realtimeData) return [];

    const generatedAlerts = [];
    const actualSensorData = realtimeData.reading || realtimeData;

    // Check each water quality parameter
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    parameters.forEach(param => {
      const value = actualSensorData[param] || actualSensorData[param.toLowerCase()];
      if (value !== null && value !== undefined && !isNaN(value)) {
        const evaluation = evaluateParameter(param, value);
        if (evaluation && evaluation.type !== 'success') {
          const threshold = thresholds[param] || thresholds[param.toLowerCase()];
          const paramDisplay = param.charAt(0).toUpperCase() + param.slice(1);

          let message = getRandomAlertMessage(param, evaluation.alertType);

          generatedAlerts.push({
            parameter: paramDisplay,
            type: evaluation.type,
            severity: evaluation.level === 'critical' ? 'high' : 'medium',
            title: `${paramDisplay} Alert`,
            message: message,
            value: value
          });
        }
      }
    });

    // Check weather conditions (isRaining)
    const isRaining = actualSensorData.isRaining;
    if (isRaining !== null && isRaining !== undefined && !isNaN(isRaining)) {
      let weatherAlertType = null;
      let severity = 'low';

      // Define when to trigger weather alerts
      if (isRaining === 1) { // Light rain
        weatherAlertType = 'low'; // Minor weather event
        severity = 'low';
      } else if (isRaining === 2) { // Heavy rain
        weatherAlertType = 'high'; // Severe weather
        severity = 'high';
      }

      if (weatherAlertType) {
        const message = getRandomAlertMessage('weather', weatherAlertType);
        generatedAlerts.push({
          parameter: 'isRaining',
          type: weatherAlertType === 'high' ? 'error' : 'warning',
          severity: severity,
          title: `Weather Alert`,
          message: message,
          value: isRaining
        });
      }
    }

    return generatedAlerts;
  }, [evaluateParameter, thresholds]);

  // Function to get random message for parameter
  const getRandomAlertMessage = useCallback((parameter, alertType) => {
    const paramKey = parameter.toLowerCase();
    const paramMessages = messageCache[paramKey];

    if (!paramMessages || !paramMessages[alertType]) {
      return `${parameter.charAt(0).toUpperCase() + parameter.slice(1)} level is outside normal range and may affect aquaculture species.`;
    }

    const messages = paramMessages[alertType];
    if (!messages || messages.length === 0) {
      return `${parameter.charAt(0).toUpperCase() + parameter.slice(1)} level is outside normal range and may affect aquaculture species.`;
    }

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }, [messageCache]);

  // Send FCM notification for alert (fire-and-forget pattern)
  const sendFCMAlertNotification = useCallback(async (alert, sensorData) => {
    try {
      // Get current FCM token
      const tokenResult = await notificationManager.getDeviceToken();
      if (!tokenResult.success) {
        console.log('⚠️ No FCM token available for push notifications');
        return { success: false, reason: 'No FCM token' };
      }

      const fcmToken = tokenResult.token;

      // Send water quality alert to FCM server with category
      const result = await fcmService.sendWaterQualityAlert(fcmToken, {
        sensorId: `sensor-${alert.parameter?.toLowerCase() || 'unknown'}`,
        parameter: alert.parameter?.toLowerCase() || 'unknown',
        value: alert.value || 0,
        threshold: getThresholdForParameter(alert.parameter),
        location: 'Main Pond', // Could be configurable
        unit: getUnitForParameter(alert.parameter),
        category: getCategoryForParameter(alert.parameter), // Weather alerts are "general"
        ...sensorData // Override with realtime data if provided
      });

      if (result.success) {
        console.log('🚀 FCM alert sent successfully:', alert.title, `(${getCategoryForParameter(alert.parameter)} category)`);
        return { success: true, messageId: result.messageId };
      } else {
        console.warn('⚠️ FCM alert failed, falling back to local notification:', result.error);
        // Still send local notification even if FCM fails
        await sendLocalFallbackAlert(alert);
        return { success: false, error: result.error, fallbackUsed: true };
      }
    } catch (error) {
      console.error('❌ Error sending FCM alert:', error);
      // Always fallback to local notification
      await sendLocalFallbackAlert(alert);
      return { success: false, error: error.message, fallbackUsed: true };
    }
  }, []);

  // Send local notification as fallback
  const sendLocalFallbackAlert = useCallback(async (alert) => {
    try {
      await notificationManager.sendLocalNotification({
        title: alert.title,
        body: alert.message,
        data: {
          type: 'alert',
          parameter: alert.parameter,
          value: alert.value,
          severity: alert.severity,
          timestamp: alert.timestamp
        },
        categoryId: 'alerts',
        priority: alert.severity === 'high' ? 'high' : 'normal'
      });
      console.log('✅ Local notification sent as fallback');
    } catch (localError) {
      console.error('❌ Even local notification failed:', localError);
    }
  }, []);

  // Helper to get threshold for parameter
  const getThresholdForParameter = useCallback((parameter) => {
    if (!parameter) return 0;
    const paramKey = parameter.toLowerCase();
    const paramThresholds = thresholds[parameter] || thresholds[paramKey];
    if (!paramThresholds) return 0;

    // Return max threshold for alerts
    return paramThresholds.critical?.max || paramThresholds.max || 0;
  }, [thresholds]);

  // Helper to get unit for parameter
  const getUnitForParameter = useCallback((parameter) => {
    const unitMap = {
      'ph': '',
      'temperature': '°C',
      'turbidity': 'NTU',
      'salinity': 'ppt'
    };
    return unitMap[parameter?.toLowerCase()] || '';
  }, []);

  // Helper to get category for parameter (for FCM)
  const getCategoryForParameter = useCallback((parameter) => {
    if (!parameter) return 'water-quality';
    const paramKey = parameter.toLowerCase();

    // Weather alerts (isRaining parameter) are categorized as "general"
    if (paramKey === 'israining') {
      return 'general';
    }

    // All water quality parameters are "water-quality"
    return 'water-quality';
  }, []);

  // Process and normalize alerts
  const processAlerts = useCallback((alerts) => {
    if (!Array.isArray(alerts)) {
      return [];
    }

    return alerts
      .filter(alert => {
        // Filter out invalid alerts
        const isValid = alert &&
          (alert.parameter || alert.title) &&
          (alert.message || alert.description || alert.displayMessage);

        return isValid;
      })
      .map(alert => {
        // Map severity to type if type is not present
        const alertType = alert.type || mapSeverityToType(alert.severity);

        return {
          id: alert.id || `${Date.now()}-${Math.random()}`,
          title: alert.title || `${alert.parameter || 'Unknown'} Alert`,
          message: alert.message || alert.description || alert.displayMessage || 'No message provided',
          type: alertType,
          parameter: alert.parameter || '',
          severity: alert.severity || 'low',
          value: alert.value,
          timestamp: alert.timestamp || new Date(),
          isDefault: alert.isDefault || false
        };
      });
  }, [mapSeverityToType]);

  return {
    // Core functions
    evaluateParameter,
    generateAlertsFromRealtimeData,
    processAlerts,
    getRandomAlertMessage,

    // FCM Notification functions
    sendFCMAlertNotification,
    sendLocalFallbackAlert,

    // Utilities
    thresholds,
    messageCache,
    getThresholdForParameter,
    getUnitForParameter,
    getCategoryForParameter
  };
}
