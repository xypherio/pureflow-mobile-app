// src/services/notifications/NotificationManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// Simple ID generator for React Native compatibility
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Central notification management service
 * Handles all notification-related operations with single responsibility
 */
class NotificationManager {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Map();
    this.deviceToken = null;
    this.permissionStatus = null;
  }

  /**
   * Initialize the notification manager
   * Must be called before using any other methods
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      // Configure notification handler
      this.configureNotificationHandler();
      
      // Set up notification channels for Android
      await this.setupNotificationChannels();
      
      // Check current permissions
      await this.checkPermissions();
      
      this.isInitialized = true;
      console.log('✅ NotificationManager initialized successfully');
      
      return { 
        success: true, 
        message: 'Notification manager initialized',
        hasPermission: this.permissionStatus === 'granted'
      };
    } catch (error) {
      console.error('❌ Error initializing NotificationManager:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Configure how notifications are handled when received
   */
  configureNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Log notification for debugging
        console.log('📱 Notification received:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data
        });

        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });
  }

  /**
   * Set up notification channels for Android
   */
  async setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id: 'alerts',
        name: 'Water Quality Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Critical water quality alerts and warnings',
        sound: 'default',
        vibrationPattern: [300, 500, 300, 500],
      },
      {
        id: 'updates',
        name: 'System Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'System status updates and information',
        sound: 'default',
        vibrationPattern: [200],
      },
      {
        id: 'reminders',
        name: 'Maintenance Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Equipment maintenance and calibration reminders',
        sound: 'default',
      }
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }

    console.log('✅ Android notification channels configured');
  }

  /**
   * Check current notification permissions
   */
  async checkPermissions() {
    if (!Device.isDevice) {
      this.permissionStatus = 'unavailable';
      return { status: 'unavailable', reason: 'Not a physical device' };
    }

    const { status } = await Notifications.getPermissionsAsync();
    this.permissionStatus = status;
    
    return { status };
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions() {
    if (!Device.isDevice) {
      return { 
        success: false, 
        status: 'unavailable',
        reason: 'Must use physical device for push notifications' 
      };
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }
      
      this.permissionStatus = finalStatus;
      
      if (finalStatus === 'granted') {
        // Try to get push token after permission granted
        await this.getDeviceToken();
      }
      
      return { 
        success: finalStatus === 'granted', 
        status: finalStatus 
      };
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get device push token for remote notifications
   */
  async getDeviceToken(forceRefresh = false) {
    if (!Device.isDevice) {
      return { success: false, reason: 'Not a physical device' };
    }

    if (this.deviceToken && !forceRefresh) {
      console.log('📱 Using cached device token:', this.deviceToken);
      return { success: true, token: this.deviceToken };
    }

    try {
      // Check permissions first
      if (this.permissionStatus !== 'granted') {
        const permissionResult = await this.requestPermissions();
        if (!permissionResult.success) {
          return { success: false, reason: 'No notification permissions' };
        }
      }

      // Get the token
      const tokenResult = await Notifications.getExpoPushTokenAsync();
      this.deviceToken = tokenResult.data;

      // Store token locally for future use (both formats for compatibility)
      await AsyncStorage.setItem('expo_push_token', this.deviceToken);
      await AsyncStorage.setItem('expo_push_tokens', JSON.stringify([this.deviceToken]));

      console.log('✅ Device token obtained:', this.deviceToken);
      
      return { 
        success: true, 
        token: this.deviceToken 
      };
    } catch (error) {
      console.error('❌ Error getting device token:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Send local notification immediately
   */
  async sendLocalNotification(options) {
    const {
      title,
      body,
      data = {},
      categoryId = 'updates',
      priority = 'default'
    } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            id: generateId()
          },
          sound: 'default',
          categoryIdentifier: categoryId,
          priority: priority === 'high' ? 'high' : 'default'
        },
        trigger: null, // Send immediately
      });

      console.log('📤 Local notification sent:', { 
        id: notificationId, 
        title, 
        body 
      });

      return { 
        success: true, 
        notificationId 
      };
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(options, trigger) {
    const {
      title,
      body,
      data = {},
      categoryId = 'reminders'
    } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            ...data,
            scheduled: true,
            timestamp: new Date().toISOString(),
            id: generateId()
          },
          sound: 'default',
          categoryIdentifier: categoryId,
        },
        trigger
      });

      console.log('⏰ Notification scheduled:', { 
        id: notificationId, 
        title, 
        trigger 
      });

      return { 
        success: true, 
        notificationId 
      };
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Add listener for notification events
   */
  addNotificationReceivedListener(callback) {
    const listenerId = generateId();
    
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received in listener:', notification.request.identifier);
        callback(notification);
      }
    );

    this.listeners.set(listenerId, {
      type: 'received',
      subscription,
      callback
    });

    return {
      id: listenerId,
      remove: () => {
        subscription.remove();
        this.listeners.delete(listenerId);
      }
    };
  }

  /**
   * Add listener for notification responses (user interactions)
   */
  addNotificationResponseListener(callback) {
    const listenerId = generateId();
    
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification response:', {
          identifier: response.notification.request.identifier,
          actionIdentifier: response.actionIdentifier,
          userText: response.userText
        });
        callback(response);
      }
    );

    this.listeners.set(listenerId, {
      type: 'response',
      subscription,
      callback
    });

    return {
      id: listenerId,
      remove: () => {
        subscription.remove();
        this.listeners.delete(listenerId);
      }
    };
  }

  /**
   * Get the notification that launched the app (if any)
   */
  async getInitialNotification() {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        console.log('🚀 App launched from notification:', {
          identifier: response.notification.request.identifier,
          title: response.notification.request.content.title
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting initial notification:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('❌ Notification cancelled:', notificationId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 All scheduled notifications cancelled');
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all delivered notifications from notification tray
   */
  async clearAllDeliveredNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('🧹 All delivered notifications cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a test notification (for debugging)
   */
  async sendTestNotification() {
    console.log('🧪 Sending test notification...');

    return await this.sendLocalNotification({
      title: 'PureFlow Test Notification',
      body: 'This is a test of the local notification system. If you see this, notifications are working!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      categoryId: 'updates',
      priority: 'default'
    });
  }

  /**
   * Get current notification badge count
   */
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return { success: true, notifications };
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up all listeners and resources
   */
  cleanup() {
    console.log('🧹 Cleaning up NotificationManager...');
    
    // Remove all listeners
    for (const [id, listener] of this.listeners) {
      listener.subscription.remove();
    }
    this.listeners.clear();
    
    // Reset state
    this.isInitialized = false;
    this.deviceToken = null;
    this.permissionStatus = null;
    
    console.log('✅ NotificationManager cleaned up');
  }

  /**
   * Get current status and configuration
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.deviceToken,
      permissionStatus: this.permissionStatus,
      isPhysicalDevice: Device.isDevice,
      platform: Platform.OS,
      activeListeners: this.listeners.size
    };
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
export default notificationManager;
