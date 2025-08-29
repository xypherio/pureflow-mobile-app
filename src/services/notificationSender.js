import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Send a push notification to a specific device using Expo's push notification service
 * @param {string} expoPushToken - The Expo push token of the target device
 * @param {Object} notification - Notification content {title, body}
 * @param {Object} data - Additional data payload
 */
export const sendPushNotification = async (expoPushToken, notification, data = {}) => {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: data,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log('Successfully sent message:', result.data.id);
      return { success: true, messageId: result.data.id };
    } else {
      console.error('Failed to send message:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
};

/**
 * Send notification to multiple devices using Expo's push notification service
 * @param {string[]} expoPushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification content {title, body}
 * @param {Object} data - Additional data payload
 */
export const sendBulkPushNotifications = async (expoPushTokens, notification, data = {}) => {
  try {
    const messages = expoPushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: data,
    }));

    const chunks = [];
    const chunkSize = 100; // Expo allows up to 100 messages per request
    
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    const results = [];
    
    for (const chunk of chunks) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      results.push(result);
    }

    const successCount = results.filter(r => r.data && r.data.status === 'ok').length;
    const failureCount = results.length - successCount;
    
    console.log(`Bulk send complete. Success: ${successCount}, Failed: ${failureCount}`);
    
    return {
      success: true,
      successCount,
      failureCount,
      responses: results,
    };
  } catch (error) {
    console.error('Error sending bulk messages:', error);
    return { success: false, error };
  }
};

/**
 * Schedule a local notification
 * @param {Object} notification - Notification content {title, body}
 * @param {Object} trigger - When to show the notification (null for immediate)
 * @param {Object} data - Additional data payload
 */
export const scheduleLocalNotification = async (notification, trigger = null, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: data,
        sound: 'default',
      },
      trigger: trigger,
    });
    return { success: true };
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return { success: false, error };
  }
};
