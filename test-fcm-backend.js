#!/usr/bin/env node

/**
 * PureFlow FCM Backend Test Script
 *
 * This script demonstrates how to send FCM notifications using Firebase Admin SDK
 * with the service account key you downloaded from Firebase Console.
 *
 * Usage:
 * 1. Ensure you have the service account JSON file in the root folder
 * 2. Run: node test-fcm-backend.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your values
const SERVICE_ACCOUNT_PATH = './pureflow-system-firebase-adminsdk-fbsvc-db5f8943ad.json'; // Your actual service account filename
let TEST_FCM_TOKEN = 'YOUR_FCM_TOKEN_HERE'; // Get this from your app's Settings → Test FCM Notifications

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  try {
    // Check if service account file exists
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error(`❌ Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
      console.log('\nPlease:');
      console.log('1. Download the service account JSON from Firebase Console');
      console.log('2. Rename it to match the filename above');
      console.log('3. Place it in the root folder of your project');
      process.exit(1);
    }

    // Initialize Firebase Admin SDK
    const serviceAccount = require(path.resolve(SERVICE_ACCOUNT_PATH));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    return false;
  }
}

/**
 * Send a basic test FCM notification
 */
async function sendTestNotification(fcmToken) {
  const message = {
    token: fcmToken,
    notification: {
      title: 'PureFlow Backend Test',
      body: 'FCM is working! 🎉'
    },
    data: {
      type: 'backend_test',
      timestamp: new Date().toISOString(),
      testId: 'fcm_backend_' + Date.now()
    },
    android: {
      priority: 'high',
      notification: {
        channel_id: 'alerts',
        color: '#2455a9'
      }
    }
  };

  try {
    console.log('📤 Sending test FCM notification...');
    const response = await admin.messaging().send(message);
    console.log('✅ Test notification sent successfully!');
    console.log('📋 Message ID:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Failed to send test notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a water quality alert notification
 */
async function sendWaterQualityAlert(fcmToken, sensorData) {
  const { sensorId = 'sensor-001', parameter = 'ph', value = 8.5, threshold = 7.5 } = sensorData;

  const isHigh = value > threshold;
  const parameterNames = {
    ph: 'pH',
    temperature: 'Temperature',
    turbidity: 'Turbidity',
    salinity: 'Salinity'
  };

  const parameterName = parameterNames[parameter] || parameter;
  const status = isHigh ? 'HIGH' : 'LOW';
  const severity = isHigh ? 'critical' : 'warning';

  const message = {
    token: fcmToken,
    notification: {
      title: `${parameterName} Alert!`,
      body: `${parameterName} level is ${status}: ${value} (threshold: ${threshold})`
    },
    data: {
      type: 'water_quality_alert',
      sensorId: sensorId.toString(),
      parameter: parameter,
      value: value.toString(),
      threshold: threshold.toString(),
      severity: severity,
      timestamp: new Date().toISOString()
    },
    android: {
      priority: severity === 'critical' ? 'high' : 'normal',
      notification: {
        channel_id: severity === 'critical' ? 'alerts' : 'updates',
        color: severity === 'critical' ? '#dc2626' : '#f59e0b'
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: `${parameterName} Alert!`,
            body: `${parameterName} level is ${status}`
          },
          badge: severity === 'critical' ? 1 : 0,
          sound: severity === 'critical' ? 'water-alert.mp3' : 'default',
          'content-available': 1
        }
      }
    }
  };

  try {
    console.log(`🔔 Sending ${severity} ${parameterName} alert...`);
    const response = await admin.messaging().send(message);
    console.log('✅ Water quality alert sent successfully!');
    console.log('📋 Message ID:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Failed to send water quality alert:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 PureFlow FCM Backend Test Script');
  console.log('=====================================\n');

  // Step 1: Initialize Firebase
  if (!initializeFirebase()) {
    return;
  }

  // Step 2: Check FCM token
  if (TEST_FCM_TOKEN === 'YOUR_FCM_TOKEN_HERE') {
    console.log('⚠️  FCM Token not configured!');
    console.log('\nTo get your FCM token:');
    console.log('1. Open your PureFlow app');
    console.log('2. Go to Settings');
    console.log('3. Tap "Test FCM Notifications"');
    console.log('4. Copy the token that appears');
    console.log('5. Replace YOUR_FCM_TOKEN_HERE in this script\n');

    // Try to read from a token file instead
    const tokenFile = './fcm-token.txt';
    if (fs.existsSync(tokenFile)) {
      const savedToken = fs.readFileSync(tokenFile, 'utf8').trim();
      if (savedToken && savedToken !== 'YOUR_FCM_TOKEN_HERE') {
        console.log('📄 Found saved FCM token in fcm-token.txt');
        await runTests(savedToken);
        return;
      }
    }

    console.log('❌ No FCM token found. Please update TEST_FCM_TOKEN in this script.');
    return;
  }

  await runTests(TEST_FCM_TOKEN);
}

/**
 * Run the FCM tests
 */
async function runTests(fcmToken) {
  console.log(`📱 Using FCM token: ${fcmToken.substring(0, 20)}...\n`);

  // Test 1: Basic notification
  console.log('Test 1: Basic FCM Notification');
  const test1Result = await sendTestNotification(fcmToken);
  console.log('');

  // Wait a moment between tests
  await delay(2000);

  // Test 2: Water quality alert - pH high
  console.log('Test 2: Water Quality Alert (pH Critical)');
  const test2Result = await sendWaterQualityAlert(fcmToken, {
    sensorId: 'sensor-ph-001',
    parameter: 'ph',
    value: 9.2,
    threshold: 8.5
  });
  console.log('');

  // Test 3: Water quality alert - Temperature low
  console.log('Test 3: Water Quality Alert (Temperature Warning)');
  const test3Result = await sendWaterQualityAlert(fcmToken, {
    sensorId: 'sensor-temp-001',
    parameter: 'temperature',
    value: 18.5,
    threshold: 25.0
  });
  console.log('');

  // Test 4: Custom alert
  console.log('Test 4: Maintenance Reminder');
  const maintenanceAlert = {
    token: fcmToken,
    notification: {
      title: 'Maintenance Reminder',
      body: 'Time to calibrate your pH sensor!'
    },
    data: {
      type: 'maintenance_reminder',
      action: 'calibrate_ph_sensor',
      daysDue: '3',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await admin.messaging().send(maintenanceAlert);
    console.log('✅ Maintenance reminder sent!');
    console.log('📋 Message ID:', response);
  } catch (error) {
    console.error('❌ Failed to send maintenance reminder:', error.message);
  }

  // Summary
  console.log('\n🎉 FCM Backend Tests Complete!');
  console.log('================================');
  console.log('Check your app for notifications.');
  console.log('Each test should trigger a push notification.');
}

/**
 * Utility delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  // If token provided as command line argument
  const providedToken = args[0];
  if (providedToken && providedToken !== 'YOUR_FCM_TOKEN_HERE') {
    console.log(`📱 Using FCM token from command line: ${providedToken.substring(0, 20)}...`);
    // Update the constant and run
    TEST_FCM_TOKEN = providedToken;
    main().catch(console.error);
    return;
  }
}

// Run the script
main().catch(console.error);
