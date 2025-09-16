import { useEffect, useCallback } from 'react';
import { useNotificationContext } from '@contexts/NotificationContext';
import waterQualityNotificationService from '../services/WaterQualityNotificationService';
import { useData } from '@contexts/DataContext';

/**
 * Hook for integrating water quality notifications with your data context
 */
export function useWaterQualityNotifications() {
  const { isInitialized: notificationInitialized } = useNotificationContext();
  const { realtimeData, alerts } = useData();

  // Initialize the water quality notification service
  useEffect(() => {
    if (notificationInitialized) {
      waterQualityNotificationService.initialize();
    }
  }, [notificationInitialized]);

  // Process real-time data for notifications
  useEffect(() => {
    if (realtimeData && notificationInitialized) {
      const processData = async () => {
        try {
          const result = await waterQualityNotificationService.processSensorData(realtimeData);
          
          if (result.success && result.notificationsSent.length > 0) {
            console.log(`📱 Sent ${result.notificationsSent.length} water quality notifications`);
          }

          if (result.errors && result.errors.length > 0) {
            console.warn('⚠️ Some notifications failed to send:', result.errors);
          }
        } catch (error) {
          console.error('❌ Error processing sensor data for notifications:', error);
        }
      };

      // Debounce to avoid too frequent notifications
      const timeoutId = setTimeout(processData, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [realtimeData, notificationInitialized]);

  // Process alerts for system notifications
  useEffect(() => {
    if (alerts && alerts.length > 0 && notificationInitialized) {
      const processAlerts = async () => {
        try {
          // Send notifications for new critical alerts
          const criticalAlerts = alerts.filter(alert => 
            alert.severity === 'high' || alert.type === 'critical'
          );

          for (const alert of criticalAlerts.slice(0, 3)) { // Limit to 3 most recent
            await waterQualityNotificationService.sendDeviceStatusNotification(
              'Water Quality Monitor',
              'system_alert',
              {
                message: alert.message || alert.description || 'System alert triggered',
                alertType: alert.type
              }
            );
          }
        } catch (error) {
          console.error('❌ Error processing alerts for notifications:', error);
        }
      };

      const timeoutId = setTimeout(processAlerts, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [alerts, notificationInitialized]);

  // Utility functions
  const sendMaintenanceReminder = useCallback(async (task, dueDate) => {
    return await waterQualityNotificationService.scheduleMaintenanceReminder(task, dueDate);
  }, []);

  const sendCalibrationReminder = useCallback(async (parameter, lastCalibrated) => {
    return await waterQualityNotificationService.sendCalibrationReminder(parameter, lastCalibrated);
  }, []);

  const sendDataSyncNotification = useCallback(async (success, data) => {
    return await waterQualityNotificationService.sendDataSyncNotification(success, data);
  }, []);

  const testNotifications = useCallback(async () => {
    return await waterQualityNotificationService.testNotifications();
  }, []);

  const updateThresholds = useCallback((newThresholds) => {
    return waterQualityNotificationService.updateThresholds(newThresholds);
  }, []);

  return {
    // Service instance
    service: waterQualityNotificationService,
    
    // Utility functions
    sendMaintenanceReminder,
    sendCalibrationReminder,
    sendDataSyncNotification,
    testNotifications,
    updateThresholds,
    
    // Configuration
    getConfiguration: () => waterQualityNotificationService.getConfiguration(),
    clearCooldowns: () => waterQualityNotificationService.clearCooldowns()
  };
}
