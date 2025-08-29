import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-modules-core';

// Configure notifications handler
export const configureNotifications = async () => {
  // Set the handler that will be called when a notification is received
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
};

// Check if user has notification permission
export const checkNotificationPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

// Request notification permission
export const requestNotificationPermission = async () => {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });
  return status === 'granted';
};

// Display local notification
export const displayLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error displaying notification:', error);
  }
};

// Listen for notification events
export const addNotificationReceivedListener = (listener) => {
  return Notifications.addNotificationReceivedListener(listener);
};

// Listen for notification responses (user taps on notification)
export const addNotificationResponseReceivedListener = (listener) => {
  return Notifications.addNotificationResponseReceivedListener(listener);
};

// Get the initial notification that launched the app
export const getInitialNotification = async () => {
  return await Notifications.getLastNotificationResponseAsync();
};
