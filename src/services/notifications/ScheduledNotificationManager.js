
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationManager } from './NotificationManager';
import { NotificationTemplates } from './NotificationTemplates';
import { addAlertToFirestore } from '../firebase/firestore';
import { fcmService } from '../fcmService';

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

  async getFCMSettings() {
    return true;
  }

  async getNotificationPreferences() {
    return {
      dailyReports: true,
      monitoringAlerts: true,
      monthlyMaintenance: true,
      waterQualityAlerts: true,
      forecastAlerts: true,
      fcmEnabled: true
    };
  }

  async sendFCMIfEnabled(notification) {
    try {
      const fcmEnabled = await this.getFCMSettings();
      if (fcmEnabled) {
        console.log('📡 Sending FCM for scheduled notification');
        await fcmService.sendCustomNotification(null, {
          title: notification.title,
          body: notification.body,
          type: 'general',
          data: notification.data,
          timestamp: new Date().toISOString()
        });
        console.log('✅ FCM notification sent');
      } else {
        console.log('🔕 FCM disabled for scheduled notifications');
      }
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);
      // Don't fail the main scheduling operation if FCM fails
    }
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

      // All notifications are always enabled - schedule everything
      console.log('🔧 All notifications enabled by default');

      // Schedule all notification types
      await this.scheduleDailyReminders();
      await this.scheduleMonitoringReminders();
      await this.scheduleMonthlyMaintenanceReminders();

      this.isInitialized = true;
      console.log('✅ ScheduledNotificationManager initialized with user preferences');

      return { success: true };
    } catch (error) {
      console.error('❌ Error initializing ScheduledNotificationManager:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule all daily reminders - always schedules both forecast and report reminders
   */
  async scheduleDailyReminders(preferences = null) {
    try {
      // Cancel any existing schedules first (but keep monitoring reminders)
      await this.cancelDailyReminders();

      // Always schedule both daily reminders
      await this.scheduleForecastReminder();
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

        // Maintenance reminders are now only sent as notifications - not stored as alerts
        console.log('� Monthly maintenance reminder scheduled (not stored in Firebase alerts)');

        console.log('📅 Monthly maintenance reminder scheduled for 28th of each month at 10 AM');
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling monthly maintenance reminder:', error);
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

        // Use smart scheduling to prevent immediate firing
        const smartTime = this.getSmartScheduleTime(hour, minute);

        // Schedule notification for the smart calculated time
        const result = await notificationManager.scheduleNotification(
          monitoringNotification,
          {
            date: smartTime // Schedule for this exact date/time
          }
        );

        if (result.success) {
          this.schedules.set(id, {
            id: result.notificationId,
            type: 'monitoring_reminder',
            trigger: { smartTime: smartTime.toISOString(), hour, minute },
            created: new Date().toISOString(),
            active: true
          });

          results.push({ id, result, scheduledTime: smartTime.toISOString() });
          console.log(`⏰ Monitoring reminder smart-scheduled for ${smartTime.toLocaleString()}`);
        } else {
          console.error(`❌ Failed to schedule monitoring reminder for ${hour}:${minute.toString().padStart(2, '0')}:`, result.error);
          results.push({ id, result });
        }
      }

      await this.saveSchedulesToStorage();
      console.log('✅ All monitoring reminders smart-scheduled (won\'t fire immediately)');

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

      // Create notification template
      const forecastNotification = NotificationTemplates.forecastReminder();

      // Use smart scheduling to prevent immediate firing (10 PM)
      const smartTime = this.getSmartScheduleTime(22, 0);

      // Schedule notification for the smart calculated time (tomorrow if today's 10 PM has passed)
      const result = await notificationManager.scheduleNotification(
        forecastNotification,
        {
          date: smartTime // Schedule for this exact date/time
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'forecast_reminder',
          trigger: { smartTime: smartTime.toISOString(), hour: 22, minute: 0 },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
        console.log(`📅 Forecast reminder smart-scheduled for ${smartTime.toLocaleString()}`);
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

      // Create notification template
      const reportNotification = NotificationTemplates.reportReminder();

      // Use smart scheduling to prevent immediate firing (8 PM)
      const smartTime = this.getSmartScheduleTime(20, 0);

      // Schedule notification for the smart calculated time (tomorrow if today's 8 PM has passed)
      const result = await notificationManager.scheduleNotification(
        reportNotification,
        {
          date: smartTime // Schedule for this exact date/time
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'report_reminder',
          trigger: { smartTime: smartTime.toISOString(), hour: 20, minute: 0 },
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
        console.log(`📅 Report reminder smart-scheduled for ${smartTime.toLocaleString()}`);
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
   * Calculate the next scheduled time for daily reminders, preventing immediate firing
   * Always schedules for tomorrow if today's scheduled time has passed, or today if it hasn't
   */
  getSmartScheduleTime(hour, minute = 0) {
    const now = new Date();
    const todayTarget = new Date(now);
    todayTarget.setHours(hour, minute, 0, 0);

    // If target time is today and hasn't passed, schedule for today
    if (todayTarget > now) {
      return todayTarget;
    }

    // If target time has passed today OR it's exactly now, schedule for tomorrow
    const tomorrowTarget = new Date(todayTarget);
    tomorrowTarget.setDate(tomorrowTarget.getDate() + 1);

    return tomorrowTarget;
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
   * Reschedule all notifications - all notifications are always enabled
   */
  async rescheduleBasedOnPreferences() {
    try {
      console.log('🔄 Rescheduling all notifications (all types always enabled)...');

      // Cancel all existing notifications first
      await this.cancelAllScheduledNotifications();

      // Always schedule all notification types
      await this.scheduleDailyReminders();
      await this.scheduleMonitoringReminders();
      await this.scheduleMonthlyMaintenanceReminders();

      console.log('✅ All notifications rescheduled (always enabled)');
      return { success: true };
    } catch (error) {
      console.error('❌ Error rescheduling notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reschedule all notifications (useful after app restart or time changes)
   */
  async rescheduleAll() {
    console.log('🔄 Rescheduling all notifications...');
    await this.cancelAllScheduledNotifications();
    await this.scheduleDailyReminders();
    await this.scheduleMonitoringReminders();
    await this.scheduleMonthlyMaintenanceReminders();
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
