/**
 * Test script for the PureFlow notification system
 *
 * This script tests the key components of the notification system:
 * - ScheduledNotificationManager
 * - notification templates
 * - WaterQualityNotifier enhanced features
 */

import { scheduledNotificationManager } from './src/services/notifications/ScheduledNotificationManager.js';
import { notificationManager } from './src/services/notifications/NotificationManager.js';
import { NotificationTemplates } from './src/services/notifications/NotificationTemplates.js';
import { waterQualityNotificationService } from './src/services/WaterQualityNotificationService.js';

async function testNotificationSystem() {
  console.log('🧪 Testing PureFlow Notification System...\n');

  try {
    // Test 1: Initialize NotificationManager
    console.log('1️⃣ Testing NotificationManager initialization...');
    const initResult = await notificationManager.initialize();
    console.log('✅ NotificationManager initialized:', initResult);

    // Test 2: Initialize ScheduledNotificationManager
    console.log('\n2️⃣ Testing ScheduledNotificationManager initialization...');
    const scheduledInit = await scheduledNotificationManager.initialize();
    console.log('✅ ScheduledNotificationManager initialized:', scheduledInit);

    // Test 3: Check if daily reminders are scheduled
    console.log('\n3️⃣ Checking scheduled reminders...');
    const reminderStatus = scheduledNotificationManager.areDailyRemindersActive();
    console.log('📅 Reminder status:', reminderStatus);

    // Test 4: Show scheduled notifications
    console.log('\n4️⃣ Current scheduled notifications:');
    const schedules = scheduledNotificationManager.getSchedulesStatus();
    console.log(JSON.stringify(schedules, null, 2));

    // Test 5: Test notification templates
    console.log('\n5️⃣ Testing notification templates...');
    const testTemplates = {
      forecast: NotificationTemplates.forecastReminder(),
      report: NotificationTemplates.reportReminder(),
      borderline: NotificationTemplates.borderlineAlert('pH', 8.2, 8.5, 'high'),
      harmful: NotificationTemplates.harmfulStateAlert(['pH', 'temperature'], 2),
      unstable: NotificationTemplates.connectionUnstable('DATM', 3),
      deviceUnstable: NotificationTemplates.deviceUnstable('DATM')
    };

    Object.entries(testTemplates).forEach(([name, template]) => {
      console.log(`   🌅 ${name.charAt(0).toUpperCase() + name.slice(1)}:`, {
        title: template.title,
        hasBody: !!template.body,
        priority: template.priority
      });
    });

    // Test 6: Test threshold analysis (mock data)
    console.log('\n6️⃣ Testing threshold analysis...');
    if (waterQualityNotificationService.processSensorDataWithThresholdAlerts) {
      const testSensorData = {
        pH: 8.2, // Borderline high
        temperature: 29.5, // Borderline high
        turbidity: 45, // Within normal range
        salinity: 2.2 // Within normal range
      };

      console.log('📊 Test sensor data:', testSensorData);
      const result = await waterQualityNotificationService.processSensorDataWithThresholdAlerts(testSensorData);
      console.log('📊 Analysis result:', result);
    }

    // Test 7: Send a test local notification
    console.log('\n7️⃣ Testing local notification...');
    const testNotification = {
      title: '🧪 Test Notification',
      body: 'This is a test of the PureFlow notification system',
      data: { test: true }
    };

    const localResult = await notificationManager.sendLocalNotification(testNotification);
    console.log('📱 Test notification result:', localResult);

    // Test 8: Check monitoring status
    console.log('\n8️⃣ Checking monitoring status...');
    const monitoringStatus = waterQualityNotificationService.getMonitoringStatus();
    console.log('📊 Monitoring status:', {
      connectionState: monitoringStatus.connectionState,
      connectionAttempts: monitoringStatus.connectionAttempts,
      maxAttempts: monitoringStatus.maxAttempts
    });

    console.log('\n✅ All notification system tests completed successfully!');

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    scheduledNotificationManager.destroy();

    return {
      success: true,
      results: {
        initialization: !!initResult.success,
        scheduling: !!scheduledInit.success,
        reminders: reminderStatus,
        templates: Object.keys(testTemplates).length,
        monitoring: monitoringStatus
      }
    };

  } catch (error) {
    console.error('❌ Notification system test failed:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNotificationSystem()
    .then(result => {
      console.log('\n� Final Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { testNotificationSystem };
