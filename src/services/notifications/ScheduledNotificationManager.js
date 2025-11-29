
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationManager } from './NotificationManager';
import { NotificationTemplates } from './NotificationTemplates';
import { addAlertToFirestore } from '../firebase/firestore';

class ScheduledNotificationManager {
  constructor() {
    this.schedules = new Map();
    this.isInitialized = false;
    this.SCHEDULE_STORAGE_KEY = 'scheduled_notifications_v2';

    // Schedule IDs for tracking
    this.SCHEDULE_IDS = {
      FORECAST_REMINDER: 'forecast_reminder_10pm',
      REPORT_REMINDER: 'report_reminder_8pm',
      MONITORING_REMINDER_6AM: 'monitoring_reminder_6am',
      MONITORING_REMINDER_12PM: 'monitoring_reminder_12pm',
      MONITORING_REMINDER_6PM: 'monitoring_reminder_6pm'
    };

    console.log('🔧 ScheduledNotificationManager constructed');
  }

  /**
   * Initialize the scheduled notification manager
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing ScheduledNotificationManager...');

      // Load existing schedules from storage
      await this.loadSchedulesFromStorage();

      // Schedule daily reminders
      await this.scheduleDailyReminders();

      // Schedule monitoring reminders at fixed times (6 AM, 12 PM, 6 PM)
      await this.scheduleMonitoringReminders();

      // Schedule monthly maintenance and calibration reminders
      await this.scheduleMonthlyMaintenanceReminders();
      await this.scheduleMonthlyCalibrationReminders();

      this.isInitialized = true;
      console.log('✅ ScheduledNotificationManager initialized');

      return { success: true };
    } catch (error) {
      console.error('❌ Error initializing ScheduledNotificationManager:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule all daily reminders
   */
  async scheduleDailyReminders() {
    try {
      // Cancel any existing schedules first (but keep monitoring reminders)
      await this.cancelDailyReminders();

      // Schedule forecast reminder (10 PM daily)
      await this.scheduleForecastReminder();

      // Schedule report reminder (8 PM daily)
      await this.scheduleReportReminder();

      console.log('⏰ Daily reminders scheduled');
    } catch (error) {
      console.error('❌ Error scheduling daily reminders:', error);
      throw error;
    }
  }

  /**
   * Schedule monthly maintenance reminders at end of month
   */
  async scheduleMonthlyMaintenanceReminders() {
    const scheduleId = 'monthly_maintenance_reminder';

    try {
      // Cancel existing if any
      if (this.schedules.has(scheduleId)) {
        await this.cancelNotification(scheduleId);
      }

      // Create monthly maintenance reminder notification
      const maintenanceNotification = NotificationTemplates.monthlyMaintenanceReminder();

      // Schedule for end of month (28th at 10 AM to be safe - February compatible)
      const result = await notificationManager.scheduleNotification(
        maintenanceNotification,
        {
          day: 28,
          hour: 10,
          minute: 0,
          repeats: true
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'monthly_maintenance',
          trigger: { day: 28, hour: 10, minute: 0, repeats: true },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();

        // Store as alert in Firestore
        try {
          const maintenanceAlert = {
            type: 'maintenance_reminder',
            title: 'Monthly Maintenance Reminder Scheduled',
            message: 'Monthly maintenance reminder has been scheduled for the 28th of each month at 10 AM.',
            parameter: 'system',
            severity: 'info',
            timestamp: new Date(),
            category: 'maintenance',
            scheduled: true,
            recurrence: 'monthly'
          };

          await addAlertToFirestore(maintenanceAlert);
          console.log('📝 Monthly maintenance reminder stored as alert in Firestore');
        } catch (alertError) {
          console.error('❌ Error storing maintenance alert in Firestore:', alertError);
          // Don't fail the entire operation if alert storage fails
        }

        console.log('📅 Monthly maintenance reminder scheduled for 28th of each month at 10 AM');
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling monthly maintenance reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule monthly calibration reminders at end of month
   */
  async scheduleMonthlyCalibrationReminders() {
    const scheduleId = 'monthly_calibration_reminder';

    try {
      // Cancel existing if any
      if (this.schedules.has(scheduleId)) {
        await this.cancelNotification(scheduleId);
      }

      // Create monthly calibration reminder notification
      const calibrationNotification = NotificationTemplates.monthlyCalibrationReminder();

      // Schedule for end of month (28th at 11 AM)
      const result = await notificationManager.scheduleNotification(
        calibrationNotification,
        {
          day: 28,
          hour: 11,
          minute: 0,
          repeats: true
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'monthly_calibration',
          trigger: { day: 28, hour: 11, minute: 0, repeats: true },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();

        // Store as alert in Firestore
        try {
          const calibrationAlert = {
            type: 'calibration_reminder',
            title: 'Monthly Calibration Reminder Scheduled',
            message: 'Monthly sensor calibration reminder has been scheduled for the 28th of each month at 11 AM.',
            parameter: 'system',
            severity: 'info',
            timestamp: new Date(),
            category: 'maintenance',
            scheduled: true,
            recurrence: 'monthly'
          };

          await addAlertToFirestore(calibrationAlert);
          console.log('📝 Monthly calibration reminder stored as alert in Firestore');
        } catch (alertError) {
          console.error('❌ Error storing calibration alert in Firestore:', alertError);
          // Don't fail the entire operation if alert storage fails
        }

        console.log('📅 Monthly calibration reminder scheduled for 28th of each month at 11 AM');
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling monthly calibration reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule monitoring reminders at fixed times (6 AM, 12 PM, 6 PM)
   */
  async scheduleMonitoringReminders() {
    try {
      // Cancel existing monitoring schedules if any
      await this.cancelAllMonitoringReminders();

      const monitoringTimes = [
        { hour: 6, minute: 0, id: 'monitoring_reminder_6am' },   // 6 AM
        { hour: 12, minute: 0, id: 'monitoring_reminder_12pm' }, // 12 PM
        { hour: 18, minute: 0, id: 'monitoring_reminder_6pm' }   // 6 PM
      ];

      const results = [];

      for (const { hour, minute, id } of monitoringTimes) {
        // Create monitoring reminder notification
        const monitoringNotification = NotificationTemplates.monitoringReminder();

        // Schedule daily notification at specific time
        const result = await notificationManager.scheduleNotification(
          monitoringNotification,
          {
            hour: hour,
            minute: minute,
            repeats: true
          }
        );

        if (result.success) {
          this.schedules.set(id, {
            id: result.notificationId,
            type: 'monitoring_reminder',
            trigger: { hour, minute, repeats: true },
            created: new Date().toISOString(),
            active: true
          });

          results.push({ id, result });
          console.log(`⏰ Monitoring reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
        }
      }

      await this.saveSchedulesToStorage();
      console.log('✅ All monitoring reminders scheduled at 6 AM, 12 PM, and 6 PM');

      return { success: true, results };
    } catch (error) {
      console.error('❌ Error scheduling monitoring reminders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule forecast reminder at 10 PM daily
   */
  async scheduleForecastReminder() {
    const scheduleId = this.SCHEDULE_IDS.FORECAST_REMINDER;

    try {
      // Cancel existing if any
      if (this.schedules.has(scheduleId)) {
        await this.cancelNotification(scheduleId);
      }

      // Calculate next 10 PM
      const next10PM = this.getNextTime(22, 0); // 10 PM

      // Create notification template
      const forecastNotification = NotificationTemplates.forecastReminder();

      // Schedule the notification
      const result = await notificationManager.scheduleNotification(
        forecastNotification,
        {
          hour: 22,
          minute: 0,
          repeats: true
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'forecast_reminder',
          trigger: { hour: 22, minute: 0, repeats: true },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
        console.log('📅 Forecast reminder scheduled for 10 PM daily');
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling forecast reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule report reminder at 8 PM daily
   */
  async scheduleReportReminder() {
    const scheduleId = this.SCHEDULE_IDS.REPORT_REMINDER;

    try {
      // Cancel existing if any
      if (this.schedules.has(scheduleId)) {
        await this.cancelNotification(scheduleId);
      }

      // Calculate next 8 PM
      const next8PM = this.getNextTime(20, 0); // 8 PM

      // Create notification template
      const reportNotification = NotificationTemplates.reportReminder();

      // Schedule the notification
      const result = await notificationManager.scheduleNotification(
        reportNotification,
        {
          hour: 20,
          minute: 0,
          repeats: true
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'report_reminder',
          trigger: { hour: 20, minute: 0, repeats: true },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
        console.log('📅 Report reminder scheduled for 8 PM daily');
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling report reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule a custom one-time notification
   */
  async scheduleCustomNotification(notificationOptions, trigger) {
    try {
      const result = await notificationManager.scheduleNotification(
        notificationOptions,
        trigger
      );

      if (result.success) {
        const scheduleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'custom',
          trigger,
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling custom notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a specific scheduled notification
   */
  async cancelNotification(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (schedule && schedule.active) {
        await notificationManager.cancelNotification(schedule.id);
        schedule.active = false;
        await this.saveSchedulesToStorage();
        console.log(`❌ Cancelled scheduled notification: ${scheduleId}`);
        return { success: true };
      }
      return { success: false, reason: 'Schedule not found or already inactive' };
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel only daily reminders (10 PM forecast + 8 PM report)
   */
  async cancelDailyReminders() {
    try {
      const dailyReminderIds = [
        this.SCHEDULE_IDS.FORECAST_REMINDER,
        this.SCHEDULE_IDS.REPORT_REMINDER
      ];

      const results = [];
      for (const scheduleId of dailyReminderIds) {
        if (this.schedules.get(scheduleId)?.active) {
          const result = await this.cancelNotification(scheduleId);
          results.push({ scheduleId, ...result });
        }
      }

      console.log('🧹 Daily reminders cancelled');
      return results;
    } catch (error) {
      console.error('❌ Error cancelling daily reminders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel all monitoring reminders (6AM, 12PM, 6PM)
   */
  async cancelAllMonitoringReminders() {
    try {
      const monitoringIds = [
        this.SCHEDULE_IDS.MONITORING_REMINDER_6AM,
        this.SCHEDULE_IDS.MONITORING_REMINDER_12PM,
        this.SCHEDULE_IDS.MONITORING_REMINDER_6PM
      ];

      const results = [];
      for (const scheduleId of monitoringIds) {
        if (this.schedules.get(scheduleId)?.active) {
          const result = await this.cancelNotification(scheduleId);
          results.push({ scheduleId, ...result });
        }
      }

      console.log('🧹 All monitoring reminders cancelled');
      return results;
    } catch (error) {
      console.error('❌ Error cancelling monitoring reminders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications() {
    try {
      const results = [];

      for (const [scheduleId, schedule] of this.schedules) {
        if (schedule.active) {
          const result = await this.cancelNotification(scheduleId);
          results.push({ scheduleId, ...result });
        }
      }

      console.log('🧹 All scheduled notifications cancelled');
      return results;
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get next occurrence of a specific time today or tomorrow
   */
  getNextTime(hour, minute = 0) {
    const now = new Date();
    const nextTime = new Date(now);
    nextTime.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    return nextTime;
  }

  /**
   * Load schedules from AsyncStorage
   */
  async loadSchedulesFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(this.SCHEDULE_STORAGE_KEY);
      if (stored) {
        const parsedSchedules = JSON.parse(stored);
        this.schedules = new Map(parsedSchedules);
        console.log('📦 Loaded scheduled notifications from storage');
      }
    } catch (error) {
      console.error('❌ Error loading schedules from storage:', error);
      this.schedules = new Map();
    }
  }

  /**
   * Save schedules to AsyncStorage
   */
  async saveSchedulesToStorage() {
    try {
      const schedulesArray = Array.from(this.schedules.entries());
      await AsyncStorage.setItem(this.SCHEDULE_STORAGE_KEY, JSON.stringify(schedulesArray));
      console.log('💾 Scheduled notifications saved to storage');
    } catch (error) {
      console.error('❌ Error saving schedules to storage:', error);
    }
  }

  /**
   * Get current schedules status
   */
  getSchedulesStatus() {
    const status = {};

    for (const [id, schedule] of this.schedules) {
      status[id] = {
        active: schedule.active,
        type: schedule.type,
        trigger: schedule.trigger,
        created: schedule.created
      };
    }

    return {
      isInitialized: this.isInitialized,
      schedules: status,
      totalActive: Array.from(this.schedules.values()).filter(s => s.active).length
    };
  }

  /**
   * Check if daily reminders are currently scheduled
   */
  areDailyRemindersActive() {
    const forecastActive = this.schedules.get(this.SCHEDULE_IDS.FORECAST_REMINDER)?.active || false;
    const reportActive = this.schedules.get(this.SCHEDULE_IDS.REPORT_REMINDER)?.active || false;

    return {
      forecastReminder: forecastActive,
      reportReminder: reportActive,
      allActive: forecastActive && reportActive
    };
  }

  /**
   * Reschedule all notifications (useful after app restart or time changes)
   */
  async rescheduleAll() {
    console.log('🔄 Rescheduling all notifications...');
    await this.cancelAllScheduledNotifications();
    await this.scheduleDailyReminders();
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.cancelAllScheduledNotifications();
    this.schedules.clear();
    this.isInitialized = false;
    console.log('🧹 ScheduledNotificationManager destroyed');
  }
}

// Create and export singleton instance
export const scheduledNotificationManager = new ScheduledNotificationManager();
export default scheduledNotificationManager;
