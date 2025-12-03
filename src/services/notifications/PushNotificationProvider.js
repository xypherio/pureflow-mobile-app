/**
 * Push Notification Provider
 *
 * Sends push notifications to Expo's servers for delivery to device push notification services
 * (FCM for Android, APNs for iOS). These notifications work even when the app is closed.
 */
export class PushNotificationProvider {
  constructor() {
    this.expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  }

  /**
   * Send a push notification
   */
  async send(notification) {
    try {
      // Validate the notification has required fields
      if (!notification.title || !notification.body) {
        throw new Error('Notification must have title and body');
      }

      // Get stored push tokens (this will need to be integrated with your token storage)
      const pushTokens = await this.getStoredPushTokens();

      if (!pushTokens || pushTokens.length === 0) {
        console.log('📱 No push tokens available for push notification');
        return {
          success: false,
          reason: 'no_push_tokens',
          message: 'No device push tokens registered'
        };
      }

      // Create Expo push messages
      const messages = this.createExpoMessages(notification, pushTokens);

      // Send each message individually via HTTP API
      const results = [];
      for (const message of messages) {
        try {
          const result = await this.sendExpoPush(message);
          results.push(result);

          // Small delay between requests to avoid rate limiting
          await this.delay(100);
        } catch (error) {
          console.error('❌ Error sending push notification:', error);
          results.push({
            success: false,
            error: error.message,
            token: message.to
          });
        }
      }

      // Process results and return summary
      return this.processResults(results);

    } catch (error) {
      console.error('❌ Push notification send error:', error);
      return {
        success: false,
        error: error.message,
        reason: 'send_error'
      };
    }
  }

  /**
   * Send a single push message to Expo's API
   */
  async sendExpoPush(message) {
    try {
      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const ticket = await response.json();

      return {
        success: true,
        ticket: ticket,
        token: message.to
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        token: message.to
      };
    }
  }

  /**
   * Create Expo push messages from notification and tokens
   */
  createExpoMessages(notification, pushTokens) {
    const validTokens = [];

    // Filter out invalid tokens (simple regex check instead of Expo.isExpoPushToken)
    for (const token of pushTokens) {
      if (!this.isValidExpoToken(token)) {
        console.warn(`⚠️ Invalid Expo push token: ${token}`);
        continue;
      }
      validTokens.push(token);
    }

    return validTokens.map(token => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: {
        ...notification.data,
        type: 'push_notification',
        sentAt: new Date().toISOString()
      },
      ttl: 86400, // 24 hours
      expiration: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      priority: notification.priority === 'high' ? 'high' : 'default',
      sound: 'default',
      channelId: notification.categoryId || 'alerts',
      categoryId: notification.categoryId,
      badge: notification.badge || 1,
      // iOS specific
      subtitle: notification.subtitle,
      // Android specific
      android: {
        channelId: notification.categoryId || 'alerts',
        priority: notification.priority === 'high' ? 'high' : 'default',
        sound: true,
        vibrate: notification.priority === 'high' ? [300, 500, 300, 500] : true
      },
      // iOS specific
      ios: {
        sound: true,
        badge: notification.badge || 1,
        categoryId: notification.categoryId
      }
    }));
  }

  /**
   * Process results and return summary
   */
  processResults(results) {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const result of results) {
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({
          token: result.token,
          error: result.error
        });
      }
    }

    const overallSuccess = successCount > 0;
    const partialSuccess = successCount > 0 && errorCount > 0;

    return {
      success: overallSuccess,
      partialSuccess,
      successCount,
      errorCount,
      totalTokens: results.length,
      errors: errors.length > 0 ? errors : undefined,
      message: partialSuccess
        ? `Sent ${successCount}/${results.length} push notifications (${errorCount} failed)`
        : overallSuccess
        ? `Successfully sent ${successCount} push notifications`
        : `Failed to send push notifications (${errorCount} errors)`
    };
  }

  /**
   * Get stored push tokens (supports both Expo and FCM tokens)
   * Returns an object with expo and fcm token arrays
   */
  async getStoredPushTokens() {
    try {
      // Import AsyncStorage for token retrieval
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      // Get Expo tokens
      let expoTokens = [];
      const storedExpoTokens = await AsyncStorage.getItem('expo_push_tokens');
      if (storedExpoTokens) {
        expoTokens = JSON.parse(storedExpoTokens);
        if (!Array.isArray(expoTokens)) expoTokens = [expoTokens];
      } else {
        // Fall back to single token format for backward compatibility
        const singleToken = await AsyncStorage.getItem('expo_push_token');
        if (singleToken) {
          expoTokens = [singleToken];
          // Convert single token to array and update storage
          await AsyncStorage.setItem('expo_push_tokens', JSON.stringify(expoTokens));
          console.log('🔄 Migrated single Expo token to array format');
        }
      }

      // Get FCM tokens
      let fcmTokens = [];
      const storedFcmTokens = await AsyncStorage.getItem('fcm_tokens');
      if (storedFcmTokens) {
        fcmTokens = JSON.parse(storedFcmTokens);
        if (!Array.isArray(fcmTokens)) fcmTokens = [fcmTokens];
      }

      return {
        expo: expoTokens,
        fcm: fcmTokens,
        all: [...expoTokens, ...fcmTokens] // Combined array for backward compatibility
      };
    } catch (error) {
      console.error('❌ Error retrieving push tokens:', error);
      return { expo: [], fcm: [], all: [] };
    }
  }

  /**
   * Legacy method for backward compatibility - returns all tokens as array
   */
  async getStoredPushTokensLegacy() {
    const tokens = await this.getStoredPushTokens();
    return tokens.all;
  }

  /**
   * Store push token (call this when you get new tokens)
   */
  async storePushToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      const existingTokens = await this.getStoredPushTokens();

      // Avoid duplicates
      if (!existingTokens.includes(token)) {
        existingTokens.push(token);
        await AsyncStorage.setItem('expo_push_tokens', JSON.stringify(existingTokens));
        console.log(`📱 Stored new push token: ${token.substring(0, 10)}...`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error storing push token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove push token (when user logs out or token becomes invalid)
   */
  async removePushToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      const existingTokens = await this.getStoredPushTokens();
      const filteredTokens = existingTokens.filter(t => t !== token);

      await AsyncStorage.setItem('expo_push_tokens', JSON.stringify(filteredTokens));
      console.log(`📱 Removed push token: ${token.substring(0, 10)}...`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error removing push token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearStoredTokens() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('expo_push_tokens');
      console.log('🧹 Cleared all stored push tokens');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing push tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a token is valid Expo format
   */
  isValidExpoToken(token) {
    // Expo push tokens start with "ExponentPushToken[" followed by alphanumeric characters and end with "]"
    const expoTokenRegex = /^ExponentPushToken\[[\w]+\]$/;
    return typeof token === 'string' && expoTokenRegex.test(token);
  }

  /**
   * Store FCM token (called by FCM service)
   */
  async storeFCMToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      const existingTokens = await this.getStoredPushTokens();
      const fcmTokens = existingTokens.fcm;

      // Avoid duplicates
      if (!fcmTokens.includes(token)) {
        fcmTokens.push(token);
        await AsyncStorage.setItem('fcm_tokens', JSON.stringify(fcmTokens));
        console.log(`📱 Stored new FCM token: ${token.substring(0, 20)}...`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error storing FCM token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove FCM token
   */
  async removeFCMToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      const existingTokens = await this.getStoredPushTokens();
      const filteredTokens = existingTokens.fcm.filter(t => t !== token);

      await AsyncStorage.setItem('fcm_tokens', JSON.stringify(filteredTokens));
      console.log(`📱 Removed FCM token: ${token.substring(0, 20)}...`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error removing FCM token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get FCM tokens only
   */
  async getFCMTokens() {
    const tokens = await this.getStoredPushTokens();
    return tokens.fcm;
  }

  /**
   * Prepare FCM payload for backend sending
   */
  prepareFCMPayload(notification, fcmTokens) {
    if (!fcmTokens || fcmTokens.length === 0) {
      console.warn('🚫 No FCM tokens provided for payload preparation');
      return null;
    }

    const payload = {
      registration_ids: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
        sound: notification.sound || 'default'
      },
      data: {
        ...notification.data,
        type: 'fcm_push',
        sentAt: new Date().toISOString(),
        categoryId: notification.categoryId || 'updates'
      },
      ttl: notification.ttl || 86400,
      priority: notification.priority === 'high' ? 'high' : 'normal'
    };

    // Add Android-specific configuration
    if (notification.priority === 'high') {
      payload.android = {
        priority: 'high',
        notification: {
          channel_id: notification.categoryId || 'alerts',
          priority: 'high',
          sound: 'default',
          vibrationTimingsMillis: [300, 500, 300, 500]
        }
      };
    }

    // Add iOS-specific configuration
    payload.apns = {
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body,
            subtitle: notification.subtitle
          },
          badge: notification.badge || 1,
          sound: notification.sound || 'default'
        }
      }
    };

    return payload;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PushNotificationProvider;
