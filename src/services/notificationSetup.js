import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure notifications appearance
export async function configureNotifications() {
  // Set the notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Create notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [300, 500],
      sound: 'default',
    });
  }
}

// Request notification permissions
export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

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
  
  return finalStatus === 'granted';
}

// Get the Expo push token
export async function getExpoPushToken() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    console.log('No notification permissions!');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

// Listen for notification events
export function addNotificationReceivedListener(listener) {
  return Notifications.addNotificationReceivedListener(listener);
}

// Listen for notification responses (user taps on notification)
export function addNotificationResponseReceivedListener(listener) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

// Get the initial notification that launched the app
export async function getInitialNotification() {
  return await Notifications.getLastNotificationResponseAsync();
}

// Clear all delivered notifications
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

// Schedule a local notification
export async function scheduleLocalNotification(notification, trigger = null, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data,
        sound: 'default',
      },
      trigger,
    });
    return true;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return false;
  }
}
