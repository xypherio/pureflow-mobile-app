// src/components/NotificationTestPanel.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNotificationContext } from '@contexts/NotificationContext';
import { useWaterQualityNotifications } from '@hooks/useWaterQualityNotifications';

/**
 * Test panel for notification functionality (Development only)
 * Remove or hide this component in production
 */
const NotificationTestPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const {
    isInitialized,
    hasPermission,
    deviceToken,
    sendNotification,
    sendTemplateNotification,
    requestPermission,
    unreadCount,
    clearAllNotifications
  } = useNotificationContext();

  const {
    testNotifications,
    sendMaintenanceReminder,
    sendCalibrationReminder,
    getConfiguration
  } = useWaterQualityNotifications();

  // Test basic notification
  const testBasicNotification = async () => {
    setTesting(true);
    try {
      const result = await sendNotification({
        title: 'Test Notification',
        body: 'This is a test notification from your water quality app!',
        data: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (result.success) {
        Alert.alert('Success', 'Test notification sent!');
      } else {
        Alert.alert('Error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Test template notification
  const testTemplateNotification = async () => {
    setTesting(true);
    try {
      const result = await sendTemplateNotification('waterQualityAlert', 'pH', '9.2', 'critical');
      
      if (result.success) {
        Alert.alert('Success', 'Template notification sent!');
      } else {
        Alert.alert('Error', result.error || 'Failed to send template notification');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Test water quality notifications
  const testWaterQualityNotifications = async () => {
    setTesting(true);
    try {
      const result = await testNotifications();
      
      if (result.success) {
        const sentCount = result.result.notificationsSent?.length || 0;
        Alert.alert(
          'Test Complete',
          `Water quality test completed. ${sentCount} notifications sent.`
        );
      } else {
        Alert.alert('Error', result.error || 'Test failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Test maintenance reminder
  const testMaintenanceReminder = async () => {
    setTesting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = await sendMaintenanceReminder(
        'pH sensor calibration',
        tomorrow.toLocaleDateString()
      );
      
      if (result.success) {
        Alert.alert('Success', 'Maintenance reminder scheduled!');
      } else {
        Alert.alert('Error', result.error || 'Failed to schedule reminder');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Test calibration reminder
  const testCalibrationReminder = async () => {
    setTesting(true);
    try {
      const result = await sendCalibrationReminder('pH', '2 weeks ago');
      
      if (result.success) {
        Alert.alert('Success', 'Calibration reminder sent!');
      } else {
        Alert.alert('Error', result.error || 'Failed to send calibration reminder');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Request permissions
  const handleRequestPermission = async () => {
    setTesting(true);
    try {
      const result = await requestPermission();
      
      if (result.success) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'Notification permissions are required for alerts.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  // Show configuration
  const showConfiguration = () => {
    const config = getConfiguration();
    const configText = JSON.stringify(config, null, 2);
    
    Alert.alert(
      'Notification Configuration',
      configText,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  if (!__DEV__) {
    return null; // Hide in production
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.toggleButtonText}>
          {isVisible ? '▼' : '▶'} Notification Test Panel
        </Text>
      </TouchableOpacity>

      {isVisible && (
        <ScrollView style={styles.panel} nestedScrollEnabled>
          <Text style={styles.title}>Notification System Test Panel</Text>
          
          {/* Status Information */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status:</Text>
            <Text style={[styles.statusText, isInitialized ? styles.success : styles.error]}>
              Initialized: {isInitialized ? 'Yes' : 'No'}
            </Text>
            <Text style={[styles.statusText, hasPermission ? styles.success : styles.error]}>
              Permission: {hasPermission ? 'Granted' : 'Denied'}
            </Text>
            <Text style={styles.statusText}>
              Device Token: {deviceToken ? 'Available' : 'None'}
            </Text>
            <Text style={styles.statusText}>
              Unread: {unreadCount}
            </Text>
          </View>

          {/* Test Buttons */}
          <View style={styles.buttonContainer}>
            {!hasPermission && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleRequestPermission}
                disabled={testing}
              >
                <Text style={styles.buttonText}>Request Permission</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testBasicNotification}
              disabled={testing || !hasPermission}
            >
              <Text style={styles.buttonText}>Test Basic Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testTemplateNotification}
              disabled={testing || !hasPermission}
            >
              <Text style={styles.buttonText}>Test Template Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testWaterQualityNotifications}
              disabled={testing || !hasPermission}
            >
              <Text style={styles.buttonText}>Test Water Quality Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testMaintenanceReminder}
              disabled={testing || !hasPermission}
            >
              <Text style={styles.buttonText}>Test Maintenance Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testCalibrationReminder}
              disabled={testing || !hasPermission}
            >
              <Text style={styles.buttonText}>Test Calibration Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={showConfiguration}
            >
              <Text style={styles.buttonText}>Show Configuration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={clearAllNotifications}
              disabled={testing}
            >
              <Text style={styles.buttonText}>Clear All Notifications</Text>
            </TouchableOpacity>
          </View>

          {testing && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Testing...</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 1000,
    maxWidth: 300,
  },
  toggleButton: {
    backgroundColor: '#2563eb',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  panel: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 400,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  statusContainer: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
  },
  statusText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  success: {
    color: '#22c55e',
  },
  error: {
    color: '#ef4444',
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  testButton: {
    backgroundColor: '#059669',
  },
  infoButton: {
    backgroundColor: '#7c3aed',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#92400e',
  },
});

export default NotificationTestPanel;

// Integration example for your existing home screen
// Add this import and component to app/(tabs)/index.jsx

/*
import NotificationTestPanel from '@components/NotificationTestPanel';

// Add this component at the end of your return statement in HomeScreen
<NotificationTestPanel />
*/

// package.json dependencies to add/update
/*
{
  "dependencies": {
    "expo-notifications": "~0.27.0",
    "expo-device": "~5.9.0",
    "@react-native-async-storage/async-storage": "1.21.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
*/

// Installation commands:
/*
npx expo install expo-notifications
npx expo install expo-device
npx expo install @react-native-async-storage/async-storage
npm install uuid
npm install --save-dev @types/uuid
*/

// app.json configuration additions:
/*
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff"
    }
  }
}
*/