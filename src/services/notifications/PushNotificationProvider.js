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
   * Get stored push tokens (integrate with your existing token storage)
   * This should return an array of Expo push tokens
   */
  async getStoredPushTokens() {
    try {
      // Import AsyncStorage for token retrieval
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      // First try to get array format
      let storedTokens = await AsyncStorage.getItem('expo_push_tokens');

      if (!storedTokens) {
        // Fall back to single token format for backward compatibility
        const singleToken = await AsyncStorage.getItem('expo_push_token');
        if (singleToken) {
          // Convert single token to array and update storage
          storedTokens = JSON.stringify([singleToken]);
          await AsyncStorage.setItem('expo_push_tokens', storedTokens);
          console.log('🔄 Migrated single token to array format');
        }
      }

      if (!storedTokens) {
        return [];
      }

      const tokens = JSON.parse(storedTokens);
      return Array.isArray(tokens) ? tokens : [tokens];
    } catch (error) {
      console.error('❌ Error retrieving push tokens:', error);
      return [];
    }
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
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PushNotificationProvider;
