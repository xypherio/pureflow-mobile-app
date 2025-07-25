import { firebaseApp } from "@firebaseConfig/config";
import thresholds from "@constants/thresholds";
import { registerForPushNotificationsAsync } from "@services/pushNotifications";
import * as Notifications from "expo-notifications";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { useEffect, useRef } from "react";


const db = getFirestore(firebaseApp);

const POLL_INTERVAL = 60000; // 60 seconds

function checkThresholds(sensorType, value) {
  const t = thresholds[sensorType];
  if (!t) return null;
  if (typeof value !== "number") value = parseFloat(value);
  if (isNaN(value)) return null;
  if (t.min !== undefined && value < t.min) return "low";
  if (t.max !== undefined && value > t.max) return "high";
  return null;
}

async function pollAndAlert() {
  try {
    const snapshot = await getDocs(collection(db, "datm_data"));
    snapshot.forEach((doc) => {
      const data = doc.data();
      Object.keys(thresholds).forEach((sensorType) => {
        const value = data[sensorType];
        const status = checkThresholds(sensorType, value);
        if (status) {
          // Placeholder: trigger notification/alert
          // Example:
          // Notifications.scheduleNotificationAsync({
          //   content: {
          //     title: `Alert: ${sensorType} ${status}`,
          //     body: `${sensorType} value ${value} is ${status} (threshold: ${JSON.stringify(thresholds[sensorType])})`,
          //   },
          //   trigger: null,
          // });
          console.log(`ALERT: ${sensorType} is ${status} (value: ${value})`);
        }
      });
    });
  } catch (err) {
    console.error("Error polling Firestore:", err);
  }
}

// Start polling
let intervalId = null;
export function startAlertMonitor() {
  if (!intervalId) {
    pollAndAlert(); // Run immediately
    intervalId = setInterval(pollAndAlert, POLL_INTERVAL);
  }
}

export function stopAlertMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Handle notification received in foreground
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Handle notification response (user taps)
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // ...rest of your app
}
