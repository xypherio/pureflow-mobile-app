import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { db } from './firebase/config';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, serverTimestamp, where, getDocs, query, updateDoc } from 'firebase/firestore';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function requestUserPermission() {
  try {
    let status;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status: requestedStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = requestedStatus;
      }
      
      status = finalStatus === 'granted';
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Channel',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [300, 500],
          sound: 'default',
        });
      }
      
      return status;
    } else {
      console.log('Must use physical device for Push Notifications');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Store device token in Firestore without requiring auth
export async function registerDevice(deviceInfo = {}) {
  try {
    let token;
    
    if (Platform.OS === 'android') {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId
      })).data;
    } else {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      
      if (status !== 'granted') {
        console.error('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId
      })).data;
    }
    
    if (!token) {
      console.error('No push token available');
      return null;
    }

    // Generate a unique device ID if not provided
    const deviceId = deviceInfo.deviceId || `device_${uuidv4()}`;
    
    // Store/update device info in Firestore
    const deviceRef = doc(db, 'devices', deviceId);
    await setDoc(deviceRef, {
      expoPushToken: token,
      lastActive: serverTimestamp(),
      platform: Platform.OS,
      deviceName: Device.deviceName,
      osVersion: Device.osVersion,
      ...deviceInfo
    }, { merge: true });
      
    console.log('Device registered with push token');
    return { deviceId, expoPushToken: token };
  } catch (error) {
    console.error('Error registering device:', error);
    return null;
  }
}

export function listenToForegroundMessages(handler) {
  try {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Foreground notification received:', notification);
      if (handler) {
        handler(notification);
      }
    });
    
    return () => subscription.remove();
  } catch (error) {
    console.error('Error setting up foreground notification listener:', error);
    return () => {};
  }
}

export function setNotificationResponseHandler(handler) {
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      if (handler) {
        handler(response);
      }
    });
    
    return () => subscription.remove();
  } catch (error) {
    console.error('Error setting up notification response handler:', error);
    return () => {};
  }
}

// Get the initial notification that launched the app
export async function getInitialNotification() {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      console.log('App opened from notification:', response);
      return response;
    }
    return null;
  } catch (error) {
    console.error('Error getting initial notification:', error);
    return null;
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(title, body, data = {}, trigger = null) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger || null, // If null, triggers immediately
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

// Clear all delivered notifications
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

// Get the current notification permissions status
export async function getNotificationPermissionsStatus() {
  return await Notifications.getPermissionsAsync();
}