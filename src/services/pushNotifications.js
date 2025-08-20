import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    // In Expo Go (SDK 53+), remote push (getExpoPushTokenAsync) is not supported.
    // Only attempt to fetch token in a Development Build or Production build.
    if (Constants.appOwnership !== 'expo') {
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (e) {
        console.warn('Unable to get Expo push token (likely not a dev/prod build):', e?.message);
      }
    } else {
      console.log('Running in Expo Go: skipping remote push token. Local notifications will work.');
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
} 

// Helper to send a local notification (immediate)
export async function sendLocalNotification({ title, body, data = {} }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to schedule local notification', e);
  }
}

// Categorized notification senders
export const notificationEvents = {
  parameterApproachingUnsafe: async (parameter, value, range) => {
    const title = `Attention: ${parameter} nearing unsafe range`;
    const body = `${parameter} is ${value}. Safe range: ${range.min} - ${range.max}.`;
    await sendLocalNotification({ title, body, data: { type: 'parameter', parameter, value, range } });
  },
  rainDetected: async () => {
    const title = 'Weather Update: Rain detected';
    const body = 'It is raining. Expect potential turbidity or salinity changes.';
    await sendLocalNotification({ title, body, data: { type: 'rain' } });
  },
  dailyReportReady: async () => {
    const title = 'Daily Report Ready';
    const body = 'Your daily water quality report is now available.';
    await sendLocalNotification({ title, body, data: { type: 'report' } });
  },
  newAlert: async (alert) => {
    const title = `Alert: ${alert.title}`;
    const body = `${alert.parameter?.toUpperCase()}: ${alert.value}`;
    await sendLocalNotification({ title, body, data: { type: 'alert', alert } });
  }
};