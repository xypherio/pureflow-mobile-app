/**
 * Custom hook for notification setup and management
 *
 * Handles notification listener setup and cleanup
 */

import { useEffect } from "react";

/**
 * Hook for setting up notification listeners
 * @param {boolean} isInitialized - Whether notifications are initialized
 * @param {Function} addNotificationListener - Function to add notification listeners
 */
export const useNotificationSetup = (isInitialized, addNotificationListener) => {
  useEffect(() => {
    // Only setup if notifications are initialized
    if (!isInitialized) return;

    console.log("Setting up notification listeners...");

    // Setup notification listeners
    const setupListeners = async () => {
      try {
        // Received notification listener
        const receivedListener = addNotificationListener(
          "received",
          (notification) => {
            const content = notification?.request?.content;
            const title = content?.title || "Unknown Notification";
            const body = content?.body || "";

            console.log("📱 Home screen received notification:", {
              title,
              body,
              data: content?.data || {},
            });
          }
        );

        // Response (tap) notification listener
        const responseListener = addNotificationListener(
          "response",
          (response) => {
            const content = response.notification?.request?.content;
            const title = content?.title || "Unknown Notification";
            const body = content?.body || "";
            const notificationData = content?.data || {};

            console.log("👆 Home screen notification tapped:", {
              title,
              body,
              data: notificationData,
              actionIdentifier: response.actionIdentifier,
            });

            // Handle navigation based on notification type
            handleNotificationTap(notificationData);
          }
        );

        // Return cleanup function
        return () => {
          receivedListener?.remove?.();
          responseListener?.remove?.();
        };
      } catch (error) {
        console.error("Error setting up notification listeners:", error);
      }
    };

    // Setup listeners and get cleanup function
    let cleanup;
    setupListeners().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Return cleanup function
    return () => {
      if (cleanup && typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [isInitialized, addNotificationListener]);
};

/**
 * Handles navigation and actions based on notification type
 * @param {Object} notificationData - Data from notification tap
 */
const handleNotificationTap = (notificationData) => {
  const { type } = notificationData;

  switch (type) {
    case "water_quality_alert":
      console.log("Navigate to water quality alerts");
      break;

    case "device_offline":
    case "device_online":
      console.log("Navigate to device status");
      break;

    case "maintenance_reminder":
      console.log("Navigate to maintenance");
      break;

    case "forecast_alert":
      console.log("Navigate to forecast alerts");
      break;

    default:
      console.log("Handle general notification tap");
  }

  // TODO: Implement actual navigation logic here
  // e.g., navigation.navigate('AlertsScreen', notificationData);
};
