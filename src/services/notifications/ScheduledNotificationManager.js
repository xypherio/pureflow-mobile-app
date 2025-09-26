/**
 * Scheduled Notification Manager
 *
 * Handles recurring push notifications for daily reminders and scheduled alerts.
 * Manages notification scheduling, persistence, and automatic rescheduling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationManager } from './NotificationManager';
import { NotificationTemplates } from './NotificationTemplates';

class ScheduledNotificationManager {
  constructor() {
    this.schedules = new Map();
    this.isInitialized = false;
    this.SCHEDULE_STORAGE_KEY = 'scheduled_notifications_v2';

    // Schedule IDs for tracking
    this.SCHEDULE_IDS = {
      FORECAST_REMINDER: 'forecast_reminder_10pm',
      REPORT_REMINDER: 'report_reminder_8pm',
      MONITORING_REMINDER: 'monitoring_reminder_hourly'
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

      // Schedule monitoring reminders (every 4 hours by default)
      await this.scheduleMonitoringReminders(4);

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
   * Schedule hourly monitoring reminders
   */
  async scheduleMonitoringReminders(hoursInterval = 4) {
    const scheduleId = this.SCHEDULE_IDS.MONITORING_REMINDER;

    try {
      // Cancel existing monitoring schedule if any
      if (this.schedules.has(scheduleId)) {
        await this.cancelNotification(scheduleId);
      }

      // Create monitoring reminder notification
      const monitoringNotification = NotificationTemplates.monitoringReminder();

      // Schedule recurring notification every X hours
      const result = await notificationManager.scheduleNotification(
        monitoringNotification,
        {
          seconds: hoursInterval * 60 * 60, // Convert hours to seconds
          repeats: true
        }
      );

      if (result.success) {
        this.schedules.set(scheduleId, {
          id: result.notificationId,
          type: 'monitoring_reminder',
          trigger: { seconds: hoursInterval * 60 * 60, repeats: true },
          intervalHours: hoursInterval,
          created: new Date().toISOString(),
          active: true
        });

        await this.saveSchedulesToStorage();
        console.log(`⏰ Monitoring reminder scheduled every ${hoursInterval} hours`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error scheduling monitoring reminder:', error);
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
          trigger: { hour: 11, minute: 35, repeats: true },
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
