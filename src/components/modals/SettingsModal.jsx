import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Bug, Droplets, Save, Smartphone, Star, TestTube, X } from "lucide-react-native";
import { checkUserRated } from "../../services/firebase/ratingService";
import { fcmService } from "../../services/firebase/fcmService";
import { fcmService as fcmHttpService } from "../../services/fcmService";
import { notificationManager } from "../../services/notifications/NotificationManager";
import { scheduledNotificationManager } from "../../services/notifications/ScheduledNotificationManager";
import { notificationMonitor } from "../../services/notifications/NotificationMonitor";
import { colors } from "../../constants/colors";

const Firebase = { collection: () => ({ addDoc: () => Promise.resolve() }) };

const SettingsModal = ({ visible, onClose, onRateApp, onReportIssue }) => {
  const [settings, setSettings] = useState({
    nickname: "",
    fishpondType: "freshwater",
    customCity: "",
    setupTimestamp: null,
    notifications: {
      fcmEnabled: true,
      scheduledReminders: true,
      monitoringAlerts: true,
      waterQualityAlerts: true,
      maintenanceReminders: true,
      weatherAlerts: true,
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [setupLocked, setSetupLocked] = useState(false);
  const [daysUntilUnlock, setDaysUntilUnlock] = useState(0);
  const [hasUserRated, setHasUserRated] = useState(false);

  // Load saved settings and rating status on mount
  useEffect(() => {
    const loadSettingsAndRating = async () => {
      try {
        // Load settings
        const savedSettings = await AsyncStorage.getItem("pureflowSettings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);

          // Check if setup is locked (7 days from first setup)
          if (parsedSettings.setupTimestamp) {
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            const timeSinceSetup = Date.now() - parsedSettings.setupTimestamp;
            const daysRemaining = Math.ceil(
              (sevenDaysMs - timeSinceSetup) / (24 * 60 * 60 * 1000)
            );

            if (timeSinceSetup < sevenDaysMs) {
              setSetupLocked(true);
              setDaysUntilUnlock(Math.max(1, daysRemaining));
            } else {
              setSetupLocked(false);
              setDaysUntilUnlock(0);
            }
          }

          setSettings(parsedSettings);
        }

        // Check if user has already rated
        const userHasRated = await checkUserRated();
        setHasUserRated(userHasRated);
      } catch (error) {
        console.error("Error loading settings or rating status:", error);
      }
    };

    if (visible) {
      loadSettingsAndRating();
    }
  }, [visible]);

  // Handler functions passed from parent
  const handleRateApp = () => {
    onClose(); // Close settings modal
    onRateApp(); // Open rating modal
  };

  const handleReportIssue = () => {
    onClose(); // Close settings modal
    onReportIssue(); // Open issue reporting modal
  };

  const handleTestFCM = async () => {
    try {
      console.log('🔍 Checking FCM token availability...');

      // First check if FCM service is initialized
      let fcmToken = fcmService.getCurrentToken();

      if (!fcmToken) {
        console.log('⚠️ No FCM token found, attempting to reinitialize FCM service...');

        // Try to reinitialize FCM
        try {
          await fcmService.initialize();
          fcmToken = fcmService.getCurrentToken();
          console.log('✅ FCM service reinitialized');
        } catch (initError) {
          console.error('❌ FCM reinitialization failed:', initError);
        }
      }

      if (!fcmToken) {
        // Still no token, provide detailed troubleshooting
        Alert.alert(
          "FCM Token Not Available",
          `FCM service may not be properly initialized. Try these steps:

1. Check if you have internet connection
2. Grant notification permissions in device settings
3. Restart the app
4. Check app logs for FCM initialization messages

FCM requires proper Firebase configuration and may take a few moments to initialize on first launch.`,
          [
            { text: "Check Logs", onPress: () => console.log('📋 FCM Debug - Please check Metro bundler logs for detailed FCM messages') },
            { text: "OK" }
          ]
        );
        return;
      }

      console.log('✅ FCM token retrieved successfully:', fcmToken.substring(0, 20) + '...');

      // Import Clipboard for copying
      const { Clipboard } = require('react-native');

      console.log('📋 FULL FCM TOKEN (copy this):', fcmToken);

      Alert.alert(
        "FCM Token Retrieved",
        `Token has been copied to clipboard and logged to console.

📝 To test FCM notifications, run:
node test-fcm-backend.js [PASTE_TOKEN_HERE]

📋 Check console logs for the complete token.`,
        [
          {
            text: "Copy to Clipboard",
            onPress: async () => {
              try {
                await Clipboard.setString(fcmToken);
                Alert.alert("Copied!", "FCM token copied to clipboard successfully!");
              } catch (error) {
                Alert.alert("Copy Failed", "Could not copy token to clipboard");
              }
            }
          },
          { text: "OK" }
        ]
      );

      // Also copy to clipboard automatically
      try {
        const { Clipboard } = require('react-native');
        await Clipboard.setString(fcmToken);
        console.log('✅ FCM token automatically copied to clipboard');
      } catch (clipboardError) {
        console.warn('⚠️ Could not auto-copy token to clipboard:', clipboardError);
      }
    } catch (error) {
      console.error("❌ Error getting FCM token:", error);
      Alert.alert(
        "FCM Error",
        `Failed to retrieve FCM token: ${error.message}

Check the Metro bundler logs for detailed error information.`,
        [
          { text: "Check Logs", onPress: () => console.log('🔍 Please check Metro bundler console for detailed FCM error logs') },
          { text: "OK" }
        ]
      );
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Set timestamp for setup if this is the first time saving setup fields
      let updatedSettings = { ...settings };
      if (
        !settings.setupTimestamp &&
        (settings.nickname || settings.fishpondType || settings.customCity)
      ) {
        updatedSettings.setupTimestamp = Date.now();
        setSettings(updatedSettings);
      }

      // Save only setup fields to AsyncStorage
      await AsyncStorage.setItem(
        "pureflowSettings",
        JSON.stringify(updatedSettings)
      );

      Alert.alert(
        "Settings Saved",
        "Your settings have been saved successfully!",
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLocalNotification = async () => {
    try {
      console.log('🔔 Testing local notification...');
      const result = await notificationManager.sendTestNotification();

      if (result.success) {
        Alert.alert(
          "Local Notification Sent",
          "You should see a test notification appear on your device. If you don't see it:",
          [
            { text: "Check Permissions", style: "default" },
            { text: "OK" }
          ]
        );
      } else {
        Alert.alert(
          "Local Notification Failed",
          `Failed to send: ${result.error || 'Unknown error'}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ Error testing local notification:', error);
      Alert.alert("Error", `Failed to test local notification: ${error.message}`);
    }
  };

  const handleTestScheduledNotification = async () => {
    try {
      console.log('⏰ Testing scheduled notification...');

      // Schedule a test notification 1 minute from now
      const testTime = new Date(Date.now() + 60000); // 1 minute

      const result = await notificationManager.scheduleNotification(
        {
          title: "Scheduled Notification Test",
          body: "This notification was scheduled and should appear 1 minute after you tapped the test button.",
          data: { type: "scheduled_test", timestamp: new Date().toISOString() },
          categoryId: "reminders"
        },
        {
          date: testTime
        }
      );

      if (result.success) {
        Alert.alert(
          "Scheduled Notification Test",
          `✅ Test notification scheduled for: ${testTime.toLocaleTimeString()}

⏰ It should appear in about 1 minute. Make sure the app stays in the background and your device isn't in Do Not Disturb mode.`,
          [
            { text: "Check Status", onPress: () => handleCheckNotificationStatus() },
            { text: "OK" }
          ]
        );
      } else {
        Alert.alert("Scheduling Failed", `Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error testing scheduled notification:', error);
      Alert.alert("Error", `Failed to schedule test: ${error.message}`);
    }
  };

  const handleCheckNotificationStatus = async () => {
    try {
      console.log('📊 Checking notification status...');

      const notificationStatus = notificationManager.getStatus();
      const scheduledStatus = scheduledNotificationManager.getSchedulesStatus();

      let statusMessage = `📱 Notification System Status:\n\n`;
      statusMessage += `Platform: ${notificationStatus.platform}\n`;
      statusMessage += `Initialized: ${notificationStatus.isInitialized ? '✅' : '❌'}\n`;
      statusMessage += `Permissions: ${notificationStatus.permissionStatus || 'unknown'}\n`;
      statusMessage += `Physical Device: ${notificationStatus.isPhysicalDevice ? '✅' : '❌'}\n\n`;

      statusMessage += `⏰ Scheduled Notifications:\n`;
      statusMessage += `Initialized: ${scheduledStatus.isInitialized ? '✅' : '❌'}\n`;
      statusMessage += `Active Schedules: ${scheduledStatus.totalActive}\n\n`;

      if (scheduledStatus.schedules) {
        statusMessage += `📋 Active Schedules:\n`;
        Object.entries(scheduledStatus.schedules).forEach(([id, schedule]) => {
          if (schedule.active) {
            statusMessage += `• ${id}: ${schedule.trigger?.hour || 'N/A'}:${schedule.trigger?.minute?.toString().padStart(2, '0') || 'N/A'} (${schedule.type})\n`;
          }
        });
      }

      Alert.alert(
        "Notification Status",
        statusMessage.length > 1000 ? statusMessage.substring(0, 1000) + "..." : statusMessage,
        [
          { text: "Copy Log", onPress: () => {
            console.log('📋 Full Status:', { notificationStatus, scheduledStatus });
          }},
          { text: "OK" }
        ]
      );

    } catch (error) {
      console.error('❌ Error checking status:', error);
      Alert.alert("Error", `Failed to get status: ${error.message}`);
    }
  };

  const handleBatteryOptimizationGuidance = () => {
    const isAndroid = Platform?.OS === 'android';

    if (!isAndroid) {
      Alert.alert(
        "Battery Optimization",
        "iOS doesn't have aggressive battery optimization like Android, so scheduled notifications should work reliably.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Android Battery Optimization",
      `Most Android devices aggressively stop background apps, which prevents scheduled notifications from working.

📋 To fix this issue:

1. Go to Settings → Apps → PureFlow
2. Tap "Battery" or "Battery usage"
3. Select "Don't optimize" or "No restrictions"
4. Also check: Settings → Notifications → PureFlow → Allow notifications

⚠️ If you force-stop the app, all scheduled notifications will be cancelled.`,
      [
        { text: "OK, Got it" },
        {
          text: "Check Now",
          onPress: () => {
            console.log('🔋 User should check: Settings → Apps → PureFlow → Battery');
          }
        }
      ]
    );
  };

  const handleInitializeSchedules = async () => {
    try {
      console.log('🔄 Manually initializing scheduled notifications...');

      // Try to initialize if not already done
      if (!scheduledNotificationManager.getSchedulesStatus().isInitialized) {
        await scheduledNotificationManager.initialize();
      }

      // Force refresh/create all schedules
      await scheduledNotificationManager.rescheduleAll();

      const status = scheduledNotificationManager.getSchedulesStatus();

      Alert.alert(
        "Schedules Initialized",
        `✅ Scheduled notification system initialized

📊 Status:
• Initialized: ${status.isInitialized ? 'YES' : 'NO'}
• Active Schedules: ${status.totalActive}

Daily schedules should now be active at:
• 6:00 AM - Monitoring reminder
• 12:00 PM - Monitoring reminder  
• 6:00 PM - Monitoring reminder
• 8:00 PM - Report reminder
• 10:00 PM - Forecast reminder

Plus monthly maintenance reminders.`,
        [
          { text: "Check Status", onPress: () => handleCheckNotificationStatus() },
          { text: "OK" }
        ]
      );

    } catch (error) {
      console.error('❌ Error initializing schedules:', error);
      Alert.alert(
        "Initialization Failed",
        `Failed to initialize notification schedules: ${error.message}`,
        [
          { text: "Check Logs", onPress: () => console.log('🔍 Check Metro bundler logs for detailed error') },
          { text: "OK" }
        ]
      );
    }
  };

  const handleCheckHealthStatus = async () => {
    try {
      console.log('🩺 Checking notification health status...');

      const health = notificationMonitor.getHealthStatus();

      let healthMessage = `📊 Notification Health Status: ${health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}\n\n`;
      healthMessage += `📈 Success Rate (1hr): ${health.metrics.successRate}%\n`;
      healthMessage += `📋 Total: ${health.metrics.totalDeliveries}\n`;
      healthMessage += `✅ Successful: ${health.metrics.successfulDeliveries}\n`;
      healthMessage += `❌ Failed: ${health.metrics.failedDeliveries}\n`;
      healthMessage += `🌀 Session Errors: ${health.metrics.errorsInSession}\n\n`;

      if (health.issues.length > 0) {
        healthMessage += `⚠️ Issues:\n`;
        health.issues.forEach(issue => {
          healthMessage += `• ${issue}\n`;
        });
        healthMessage += '\n';
      }

      if (health.lastError) {
        healthMessage += `🚨 Last Error:\n`;
        healthMessage += `• Type: ${health.lastError.type || 'Unknown'}\n`;
        healthMessage += `• Time: ${new Date(health.lastError.timestamp).toLocaleTimeString()}\n`;
        healthMessage += `• Error: ${health.lastError.error?.substring(0, 50)}...\n\n`;
      }

      const suggestions = notificationMonitor.getRecoverySuggestions();
      if (suggestions.length > 0) {
        healthMessage += `💡 Recovery Suggestions:\n`;
        suggestions.forEach(suggestion => {
          healthMessage += `• ${suggestion.action}\n`;
        });
      }

      Alert.alert(
        "Notification Health",
        healthMessage.length > 1000 ? healthMessage.substring(0, 1000) + "..." : healthMessage,
        [
          {
            text: "View Full Log",
            onPress: () => {
              console.log('🩺 Full Health Report:', health);
            }
          },
          { text: "OK" }
        ]
      );

    } catch (error) {
      console.error('❌ Error checking health status:', error);
      Alert.alert("Error", `Failed to check health status: ${error.message}`);
    }
  };

  const handleTestFCMIntegration = async () => {
    try {
      console.log('🚀 Testing complete FCM integration...');

      // Step 1: Get FCM token
      console.log('📱 Getting FCM token...');
      const tokenResult = await notificationManager.getDeviceToken();
      if (!tokenResult.success) {
        Alert.alert("FCM Test Failed", "Could not get FCM token. Check permissions.");
        return;
      }

      const fcmToken = tokenResult.token;
      console.log('✅ FCM token obtained');

      // Step 2: Test FCM server connection (without sending notification yet)
      console.log('🌐 Testing FCM server connection...');
      const connectionResult = await fcmHttpService.testConnection();

      if (!connectionResult.success) {
        Alert.alert(
          "FCM Server Test Failed",
          `Could not connect to FCM server: ${connectionResult.error}

Make sure the FCM server is deployed and EXPO_PUBLIC_FCM_SERVER_URL is configured.`,
          [{ text: "OK" }]
        );
        return;
      }

      console.log('✅ FCM server connection successful');

      // Step 3: Send test push notification through FCM server
      console.log('📤 Sending test push notification...');
      const pushResult = await fcmHttpService.sendCustomNotification(fcmToken, {
        title: 'PureFlow FCM Integration Test ✅',
        body: 'This push notification came from your FCM server! Remote notifications are working.',
        type: 'integration_test',
        timestamp: new Date().toISOString(),
        sound: 'default'
      });

      if (pushResult.success) {
        Alert.alert(
          "FCM Integration Test Successful! 🎉",
          `📱 Push notification sent successfully!

✅ FCM Token: Retrieved
✅ FCM Server: Connected  
✅ Push Notification: Delivered
✅ Message ID: ${pushResult.messageId || 'Available'}

📲 You should receive a push notification even if the app is closed or in background!`,
          [
            { text: "Test Local Too", onPress: () => handleTestLocalNotification() },
            { text: "Done" }
          ]
        );
      } else {
        Alert.alert(
          "FCM Push Failed",
          `Push notification failed: ${pushResult.error}

The FCM server is working but couldn't send the notification. Check server logs and Firebase configuration.`,
          [{ text: "OK" }]
        );
      }

    } catch (error) {
      console.error('❌ FCM integration test failed:', error);
      Alert.alert(
        "FCM Test Error",
        `Integration test failed: ${error.message}

Check:
• Device notification permissions
• EXPO_PUBLIC_FCM_SERVER_URL environment variable
• FCM server deployment status`,
        [{ text: "OK" }]
      );
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Fishpond Setup Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Fishpond Setup</Text>
                {setupLocked && (
                  <Text style={styles.lockedText}>
                    * Can edit again in {daysUntilUnlock} days *
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Custom Nickname</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    setupLocked && styles.inputDisabled,
                  ]}
                  placeholder="My Fishpond"
                  value={settings.nickname}
                  onChangeText={(text) =>
                    !setupLocked &&
                    setSettings((prev) => ({ ...prev, nickname: text }))
                  }
                  maxLength={50}
                  editable={!setupLocked}
                />
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>Water Type</Text>
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      settings.fishpondType === "freshwater" &&
                        styles.pickerButtonActive,
                      setupLocked && styles.pickerDisabled,
                    ]}
                    onPress={() =>
                      !setupLocked &&
                      setSettings((prev) => ({
                        ...prev,
                        fishpondType: "freshwater",
                      }))
                    }
                    disabled={setupLocked}
                  >
                    <Droplets
                      size={16}
                      color={
                        settings.fishpondType === "freshwater"
                          ? colors.white
                          : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        settings.fishpondType === "freshwater" &&
                          styles.pickerTextActive,
                      ]}
                    >
                      Freshwater
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      settings.fishpondType === "saltwater" &&
                        styles.pickerButtonActive,
                      setupLocked && styles.pickerDisabled,
                    ]}
                    onPress={() =>
                      !setupLocked &&
                      setSettings((prev) => ({
                        ...prev,
                        fishpondType: "saltwater",
                      }))
                    }
                    disabled={setupLocked}
                  >
                    <Text
                      style={[
                        styles.pickerEmoji,
                        settings.fishpondType === "saltwater" &&
                          styles.pickerEmojiActive,
                      ]}
                    >
                      🌊
                    </Text>
                    <Text
                      style={[
                        styles.pickerText,
                        settings.fishpondType === "saltwater" &&
                          styles.pickerTextActive,
                      ]}
                    >
                      Saltwater
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  City for Weather (Optional) 
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    setupLocked && styles.inputDisabled,
                  ]}
                  placeholder="Bogo City"
                  value={settings.customCity}
                  onChangeText={(text) =>
                    !setupLocked &&
                    setSettings((prev) => ({ ...prev, customCity: text }))
                  }
                  maxLength={100}
                  editable={!setupLocked}
                />
                <Text style={styles.helpText}>
                  Leave empty to use default location. Weather data will update
                  on next app restart.
                </Text>
              </View>
            </View>

            {/* Section Separator */}
            <View style={styles.separator} />

            {/* Notification Preferences Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notification Preferences</Text>
                <Text style={styles.sectionSubtitle}>Control which notifications you receive</Text>
              </View>

              <View style={styles.notificationPreferences}>
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>FCM Push Notifications</Text>
                  <Text style={styles.preferenceDescription}>Receive push notifications from server</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        fcmEnabled: !prev.notifications.fcmEnabled
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.fcmEnabled && styles.toggleTextActive
                    ]}>
                      {settings.notifications.fcmEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>Scheduled Reminders</Text>
                  <Text style={styles.preferenceDescription}>Daily alerts and forecasts</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        scheduledReminders: !prev.notifications.scheduledReminders
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.scheduledReminders && styles.toggleTextActive
                    ]}>
                      {settings.notifications.scheduledReminders ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>Monitoring Alerts</Text>
                  <Text style={styles.preferenceDescription}>Water quality monitoring reminders</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        monitoringAlerts: !prev.notifications.monitoringAlerts
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.monitoringAlerts && styles.toggleTextActive
                    ]}>
                      {settings.notifications.monitoringAlerts ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>Water Quality Alerts</Text>
                  <Text style={styles.preferenceDescription}>Critical water parameter alerts</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        waterQualityAlerts: !prev.notifications.waterQualityAlerts
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.waterQualityAlerts && styles.toggleTextActive
                    ]}>
                      {settings.notifications.waterQualityAlerts ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>Maintenance Reminders</Text>
                  <Text style={styles.preferenceDescription}>Equipment maintenance and calibration</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        maintenanceReminders: !prev.notifications.maintenanceReminders
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.maintenanceReminders && styles.toggleTextActive
                    ]}>
                      {settings.notifications.maintenanceReminders ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceText}>Weather Alerts</Text>
                  <Text style={styles.preferenceDescription}>Rain and weather notifications</Text>
                  <TouchableOpacity
                    onPress={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        weatherAlerts: !prev.notifications.weatherAlerts
                      }
                    }))}
                    style={styles.toggle}
                  >
                    <Text style={[
                      styles.toggleText,
                      settings.notifications.weatherAlerts && styles.toggleTextActive
                    ]}>
                      {settings.notifications.weatherAlerts ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Section Separator */}
            <View style={styles.separator} />

            {/* Other Options Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Other Options</Text>
              </View>

              <View style={styles.optionsContainer}>
                {!hasUserRated && (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleRateApp}
                  >
                    <Star size={20} color={colors.primary} />
                    <Text style={styles.optionButtonText}> Rate PureFlow</Text>
                  </TouchableOpacity>
                )}

                {hasUserRated && (
                  <View style={styles.optionButtonDisabled}>
                    <Star size={20} color="#9CA3AF" />
                    <Text style={styles.optionButtonTextDisabled}> Already Rated!</Text>
                    <Text style={styles.feedbackSubmitted}> ❤️ Thanks for your feedback</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleReportIssue}
                >
                  <Bug size={20} color={colors.primary} />
                  <Text style={styles.optionButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section Separator */}
            <View style={styles.separator} />

            {/* Notification Diagnostics Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notification Diagnostics</Text>
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTestFCM}
                >
                  <Smartphone size={20} color={colors.primary} />
                  <Text style={styles.optionButtonText}>Test FCM Push Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTestLocalNotification}
                >
                  <TestTube size={20} color={colors.primary} />
                  <Text style={styles.optionButtonText}>Test Local Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTestScheduledNotification}
                >
                  <TestTube size={20} color="#f59e0b" />
                  <Text style={styles.optionButtonText}>Test Scheduled Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleCheckNotificationStatus}
                >
                  <Bug size={20} color="#6b7280" />
                  <Text style={styles.optionButtonText}>Check Notification Status</Text>
                </TouchableOpacity>

                {Platform.OS === 'android' && (
                  <View>
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={handleBatteryOptimizationGuidance}
                    >
                      <TestTube size={20} color="#dc2626" />
                      <Text style={styles.optionButtonText}>Battery Optimization Guide</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleInitializeSchedules}
                >
                  <TestTube size={20} color="#10b981" />
                  <Text style={styles.optionButtonText}>Initialize Notification Schedules</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleCheckHealthStatus}
                >
                  <Bug size={20} color="#7c3aed" />
                  <Text style={styles.optionButtonText}>View Notification Health</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTestFCMIntegration}
                >
                  <TestTube size={20} color="#059669" />
                  <Text style={styles.optionButtonText}>Test FCM Integration</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons - Only show when setup is not locked */}
          {!setupLocked && (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Save
                      size={18}
                      color={colors.white}
                      style={styles.saveIcon}
                    />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    minHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  lockedText: {
    fontSize: 13,
    color: colors.primaryDark,
    marginLeft: 8,
    marginTop: 2,
    fontStyle: "italic",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  notificationPreferences: {
    gap: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  preferenceText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  preferenceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginHorizontal: 8,
  },
  toggle: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.textSecondary,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 12,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  optionButtonTextDisabled: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 12,
  },
  feedbackSubmitted: {
    fontSize: 12,
    color: "#EF4444",
    fontStyle: "italic",
    position: "absolute",
    right: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  pickerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
  },
  pickerTextActive: {
    color: colors.white,
  },
  pickerEmoji: {
    fontSize: 16,
  },
  pickerEmojiActive: {
    color: colors.white,
  },
  ratingContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginLeft: 8,
  },
  saveIcon: {
    marginRight: 8,
  },
});

export default SettingsModal;
