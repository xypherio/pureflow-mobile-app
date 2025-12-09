/**
 * Firebase Cloud Messaging Service
 *
 * Handles FCM token registration, permission requests, and message listeners
 * for Firebase Cloud Messaging push notifications.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { notificationManager } from '../notifications/NotificationManager';
import { PushNotificationProvider } from '../notifications/PushNotificationProvider';
import { fcm } from './config';

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.onMessageListeners = [];
    this.onNotificationOpenedAppListeners = [];
    this.initialNotification = null;
    this.isInitialized = false;
  }

  /**
   * Initialize FCM service and set up listeners
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔥 Initializing Firebase Cloud Messaging...');

      // Request permissions for FCM
      await this.requestPermissions();

      // Get FCM token
      await this.getToken();

      // Set up message listeners
      this.setupListeners();

      this.isInitialized = true;
      console.log('✅ FCM service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing FCM service:', error);
      throw error;
    }
  }

  /**
   * Request FCM permissions
   */
  async requestPermissions() {
    try {
      const authStatus = await fcm.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
      });

      const enabled =
        authStatus === 1 ||
        authStatus === 2;

      if (!enabled) {
        console.warn('🚫 FCM permissions not granted');
        return false;
      }

      console.log('✅ FCM permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting FCM permissions:', error);
      return false;
    }
  }

  /**
   * Get FCM registration token
   */
  async getToken() {
    try {
      // Check if we already have a stored token
      const storedToken = await AsyncStorage.getItem('fcm_token');

      if (storedToken) {
        // Verify if token is still valid by trying to get fresh token
        const freshToken = await fcm.getToken();
        if (freshToken === storedToken) {
          this.fcmToken = storedToken;
          console.log('📱 Using cached FCM token:', this.fcmToken.substring(0, 20) + '...');
          return this.fcmToken;
        }
      }

      // Get fresh FCM token
      console.log('🔥 Getting FCM registration token...');
      const token = await fcm.getToken();

      if (token) {
        this.fcmToken = token;
        // Store token locally
        await AsyncStorage.setItem('fcm_token', token);

        // Also store in PushNotificationProvider for unified token management
        const pushProvider = new PushNotificationProvider();
        await pushProvider.storeFCMToken(token);

        // Register FCM token with backend server for push notifications
        await this.registerTokenWithServer({
          deviceInfo: {
            source: 'firebase_sdk',
            appVersion: '4.2.0',
            timestamp: new Date().toISOString()
          }
        });

        console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('🚫 No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Send FCM token to server (for backend push targeting)
   */
  async registerTokenWithServer(deviceInfo = {}) {
    if (!this.fcmToken) {
      console.warn('🚫 No FCM token available for server registration');
      return false;
    }

    const serverUrl = process.env.EXPO_PUBLIC_FCM_SERVER_URL || 'http://localhost:3001';
    const apiKey = process.env.EXPO_PUBLIC_FCM_API_KEY || 'dev-key';

    const payload = {
      fcmToken: this.fcmToken,
      userData: {
        platform: Platform.OS,
        deviceInfo: {
          appVersion: '4.2.0',
          timestamp: new Date().toISOString(),
          ...deviceInfo
        }
      }
    };

    const url = `${serverUrl.replace(/\/$/, '')}/register`;

    // Simple retry logic with exponential backoff
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📡 Attempting FCM token registration (${attempt}/${maxAttempts}) to: ${url}`);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json();
          console.log('📡 FCM token registered with server successfully:', json.message);
          return true;
        }

        const text = await res.text();
        console.warn(`⚠️ registerTokenWithServer attempt ${attempt} failed: HTTP ${res.status} - ${text}`);
      } catch (err) {
        console.warn(`⚠️ registerTokenWithServer attempt ${attempt} error:`, err.message);
      }

      // Backoff
      await new Promise(r => setTimeout(r, attempt * 500));
    }

    console.error('❌ registerTokenWithServer: all attempts failed');
    return false;
  }

  /**
   * Set up FCM message listeners
   */
  setupListeners() {
    // Handle messages when app is in foreground
    fcm.onMessage(async (remoteMessage) => {
      console.log('📥 FCM message received in foreground:', remoteMessage);

      // Convert FCM message to local notification format and display
      const notification = this.convertFCMToLocalNotification(remoteMessage);
      if (notification) {
        await notificationManager.sendLocalNotification(notification);
      }

      // Notify listeners
      this.onMessageListeners.forEach(listener => {
        try {
          listener(remoteMessage);
        } catch (error) {
          console.error('❌ Error in FCM onMessage listener:', error);
        }
      });
    });

    // Handle notification tap when app is in background
    fcm.onNotificationOpenedApp(async (remoteMessage) => {
      console.log('👆 FCM notification opened app:', remoteMessage);

      // Notify listeners
      this.onNotificationOpenedAppListeners.forEach(listener => {
        try {
          listener(remoteMessage);
        } catch (error) {
          console.error('❌ Error in FCM onNotificationOpenedApp listener:', error);
        }
      });
    });

    // Handle initial notification (app launched from notification)
    fcm.getInitialNotification().then(async (remoteMessage) => {
      if (remoteMessage) {
        console.log('🚀 App launched from FCM notification:', remoteMessage);
        this.initialNotification = remoteMessage;

        // Notify listeners
        this.onNotificationOpenedAppListeners.forEach(listener => {
          try {
            listener(remoteMessage);
          } catch (error) {
            console.error('❌ Error in FCM initial notification listener:', error);
          }
        });
      }
    });

    // Handle token refresh
    fcm.onTokenRefresh(async (token) => {
      try {
        console.log('🔄 FCM token refreshed:', token.substring(0, 20) + '...');
        this.fcmToken = token;
        await AsyncStorage.setItem('fcm_token', token);

        // Persist locally and to push provider
        const pushProvider = new PushNotificationProvider();
        await pushProvider.storeFCMToken(token);

        // Send updated token to backend
        await this.registerTokenWithServer({ deviceInfo: { reason: 'refresh' } });
      } catch (err) {
        console.error('❌ Error handling token refresh:', err.message);
      }
    });

    console.log('✅ FCM listeners set up');
  }

  /**
   * Convert FCM remote message to local notification format
   */
  convertFCMToLocalNotification(remoteMessage) {
    try {
      const notification = remoteMessage.notification;
      const data = remoteMessage.data || {};

      if (!notification && !data.message) {
        console.warn('🚫 FCM message has no notification content');
        return null;
      }

      const title = notification?.title || data.title || 'PureFlow Notification';
      const body = notification?.body || data.message || 'You have a new notification';

      return {
        title,
        body,
        data: {
          ...data,
          fcmMessageId: remoteMessage.messageId,
          type: data.type || 'fcm_push',
          timestamp: new Date().toISOString()
        },
        categoryId: data.categoryId || 'updates',
        priority: notification?.android?.priority === 'high' ? 'high' : 'default'
      };
    } catch (error) {
      console.error('❌ Error converting FCM message:', error);
      return null;
    }
  }

  /**
   * Add listener for incoming FCM messages
   */
  addMessageListener(listener) {
    this.onMessageListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.onMessageListeners.indexOf(listener);
      if (index > -1) {
        this.onMessageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add listener for notification taps
   */
  addNotificationOpenedAppListener(listener) {
    this.onNotificationOpenedAppListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.onNotificationOpenedAppListeners.indexOf(listener);
      if (index > -1) {
        this.onNotificationOpenedAppListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to FCM topic
   */
  async subscribeToTopic(topic) {
    try {
      await fcm.subscribeToTopic(topic);
      console.log('✅ Subscribed to FCM topic:', topic);
      return true;
    } catch (error) {
      console.error('❌ Error subscribing to FCM topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from FCM topic
   */
  async unsubscribeFromTopic(topic) {
    try {
      await fcm.unsubscribeFromTopic(topic);
      console.log('✅ Unsubscribed from FCM topic:', topic);
      return true;
    } catch (error) {
      console.error('❌ Error unsubscribing from FCM topic:', error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken() {
    return this.fcmToken;
  }

  /**
   * Get initial notification (if app launched from notification)
   */
  getInitialNotification() {
    return this.initialNotification;
  }

  /**
   * Delete FCM token and clean up
   */
  async deleteToken() {
    try {
      if (this.fcmToken) {
        await fcm.deleteToken();
        await AsyncStorage.removeItem('fcm_token');
        this.fcmToken = null;
        console.log('✅ FCM token deleted');
      }
      return true;
    } catch (error) {
      console.error('❌ Error deleting FCM token:', error);
      return false;
    }
  }

  /**
   * Check if FCM is supported on this device
   */
  async isSupported() {
    try {
      if (!fcm) return false;

      // If the SDK exposes an async checker, call it and return the boolean result
      if (typeof fcm.isDeviceRegisteredForRemoteMessages === 'function') {
        const supported = await fcm.isDeviceRegisteredForRemoteMessages();
        return !!supported;
      }

      // Fallback: coerce any property to boolean
      return !!fcm.isDeviceRegisteredForRemoteMessages;
    } catch (error) {
      console.error('❌ Error checking FCM support:', error);
      return false;
    }
  }

  /**
   * Set background message handler (for when app is terminated)
   */
  setBackgroundMessageHandler(handler) {
    try {
      fcm.setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('🏠 FCM background message received:', remoteMessage);

        // Call custom handler if provided
        if (handler) {
          await handler(remoteMessage);
        }

        // Return a promise to indicate completion
        return Promise.resolve();
      });

      console.log('✅ FCM background message handler set');
    } catch (error) {
      console.error('❌ Error setting background message handler:', error);
    }
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;
