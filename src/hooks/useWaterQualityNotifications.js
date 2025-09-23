import { useEffect, useCallback } from 'react';
import { useData } from '@contexts/DataContext';
import { useNotifications } from './useNotifications';
import waterQualityNotificationService from '../services/WaterQualityNotificationService';

/**
 * A specialized hook to handle sending notifications based on water quality data,
 * and also provides utility functions for testing and manual triggers.
 */
export function useWaterQualityNotifications() {
  const { realtimeData } = useData();
  const { isInitialized, hasPermission, sendTemplateNotification } = useNotifications();

  // Automatic water quality notifications based on real-time data
  useEffect(() => {
    if (realtimeData && isInitialized && hasPermission) {
      const checkAndNotify = async () => {
        // pH critical check
        if (realtimeData.pH && (realtimeData.pH < 6.0 || realtimeData.pH > 9.0)) {
          await sendTemplateNotification(
            'waterQualityAlert',
            'pH',
            realtimeData.pH,
            'critical'
          );
        }

        // Temperature check
        if (realtimeData.temperature && (realtimeData.temperature > 35 || realtimeData.temperature < 20)) {
          await sendTemplateNotification(
            'waterQualityAlert',
            'Temperature',
            `${realtimeData.temperature}°C`,
            'warning'
          );
        }

        // Turbidity check
        if (realtimeData.turbidity && realtimeData.turbidity > 100) {
          await sendTemplateNotification(
            'waterQualityAlert',
            'Turbidity',
            `${realtimeData.turbidity} NTU`,
            'warning'
          );
        }
      };

      // Debounce notifications to avoid spam
      const timeout = setTimeout(checkAndNotify, 5000);
      return () => clearTimeout(timeout);
    }
  }, [realtimeData, isInitialized, hasPermission, sendTemplateNotification]);

  // Utility functions for manual testing from the test panel
  const sendMaintenanceReminder = useCallback(async (task, dueDate) => {
    return await waterQualityNotificationService.scheduleMaintenanceReminder(task, dueDate);
  }, []);

  const sendCalibrationReminder = useCallback(async (parameter, lastCalibrated) => {
    return await waterQualityNotificationService.sendCalibrationReminder(parameter, lastCalibrated);
  }, []);

  const testNotifications = useCallback(async () => {
    return await waterQualityNotificationService.testNotifications();
  }, []);

  const getConfiguration = useCallback(() => {
    return waterQualityNotificationService.getConfiguration();
  }, []);

  return {
    sendMaintenanceReminder,
    sendCalibrationReminder,
    testNotifications,
    getConfiguration,
  };
}
