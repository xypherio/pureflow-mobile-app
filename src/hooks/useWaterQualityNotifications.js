import { useCallback } from 'react';
import waterQualityNotificationService from '../services/WaterQualityNotificationService';

/**
 * Hook for notification utility functions including maintenance reminders and testing.
 * Automatic water quality notifications are handled by AlertManagementFacade.
 */
export function useNotificationUtilities() {
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

// Backward compatibility export
export const useWaterQualityNotifications = useNotificationUtilities;
