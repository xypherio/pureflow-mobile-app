// src/utils/notificationTest.js
/**
 * Notification System Test Suite
 * Run this to test your notification system programmatically
 */

import { notificationManager } from '../services/notifications/NotificationManager';
import { NotificationTemplates } from '../services/notifications/NotificationTemplates';
import { waterQualityNotificationService } from '../services/WaterQualityNotificationService';

class NotificationTestSuite {
  constructor() {
    this.results = [];
    this.testCount = 0;
    this.passedCount = 0;
  }

  async runAllTests() {
    console.log('🧪 Starting Notification System Test Suite...\n');
    
    try {
      // Test 1: Initialize notification manager
      await this.testNotificationManagerInit();
      
      // Test 2: Request permissions
      await this.testPermissionRequest();
      
      // Test 3: Test basic notification sending
      await this.testBasicNotification();
      
      // Test 4: Test template notifications
      await this.testTemplateNotifications();
      
      // Test 5: Test water quality notifications
      await this.testWaterQualityNotifications();
      
      // Test 6: Test notification storage
      await this.testNotificationStorage();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testNotificationManagerInit() {
    this.testCount++;
    console.log('1️⃣ Testing NotificationManager initialization...');
    
    try {
      const result = await notificationManager.initialize();
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ NotificationManager initialization: PASSED');
        console.log('   ✅ NotificationManager initialized successfully');
      } else {
        this.results.push('❌ NotificationManager initialization: FAILED - ' + result.error);
        console.log('   ❌ Failed:', result.error);
      }
    } catch (error) {
      this.results.push('❌ NotificationManager initialization: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  async testPermissionRequest() {
    this.testCount++;
    console.log('2️⃣ Testing permission request...');
    
    try {
      const result = await notificationManager.requestPermissions();
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ Permission request: PASSED');
        console.log('   ✅ Permissions granted');
      } else {
        this.results.push('❌ Permission request: FAILED - ' + result.error);
        console.log('   ❌ Permission denied:', result.error);
      }
    } catch (error) {
      this.results.push('❌ Permission request: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  async testBasicNotification() {
    this.testCount++;
    console.log('3️⃣ Testing basic notification sending...');
    
    try {
      const result = await notificationManager.sendLocalNotification({
        title: 'Test Notification',
        body: 'This is a test notification from the test suite',
        data: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ Basic notification: PASSED');
        console.log('   ✅ Basic notification sent successfully');
      } else {
        this.results.push('❌ Basic notification: FAILED - ' + result.error);
        console.log('   ❌ Failed:', result.error);
      }
    } catch (error) {
      this.results.push('❌ Basic notification: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  async testTemplateNotifications() {
    this.testCount++;
    console.log('4️⃣ Testing template notifications...');
    
    try {
      // Test water quality alert template
      const template = NotificationTemplates.waterQualityAlert('pH', '9.2', 'critical');
      const result = await notificationManager.sendLocalNotification(template);
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ Template notifications: PASSED');
        console.log('   ✅ Template notification sent successfully');
      } else {
        this.results.push('❌ Template notifications: FAILED - ' + result.error);
        console.log('   ❌ Failed:', result.error);
      }
    } catch (error) {
      this.results.push('❌ Template notifications: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  async testWaterQualityNotifications() {
    this.testCount++;
    console.log('5️⃣ Testing water quality notification service...');
    
    try {
      // Test with sample sensor data
      const testSensorData = {
        pH: 9.2,
        temperature: 25.5,
        turbidity: 8.1,
        dissolvedOxygen: 4.2
      };
      
      const result = await waterQualityNotificationService.processSensorData(testSensorData);
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ Water quality notifications: PASSED');
        console.log('   ✅ Water quality notifications processed successfully');
        console.log(`   📱 Notifications sent: ${result.notificationsSent?.length || 0}`);
      } else {
        this.results.push('❌ Water quality notifications: FAILED - ' + result.error);
        console.log('   ❌ Failed:', result.error);
      }
    } catch (error) {
      this.results.push('❌ Water quality notifications: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  async testNotificationStorage() {
    this.testCount++;
    console.log('6️⃣ Testing notification storage...');
    
    try {
      // Test getting scheduled notifications
      const result = await notificationManager.getScheduledNotifications();
      
      if (result.success) {
        this.passedCount++;
        this.results.push('✅ Notification storage: PASSED');
        console.log('   ✅ Notification storage working correctly');
        console.log(`   📋 Scheduled notifications: ${result.notifications?.length || 0}`);
      } else {
        this.results.push('❌ Notification storage: FAILED - ' + result.error);
        console.log('   ❌ Failed:', result.error);
      }
    } catch (error) {
      this.results.push('❌ Notification storage: ERROR - ' + error.message);
      console.log('   ❌ Error:', error.message);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Total Tests: ${this.testCount}`);
    console.log(`Passed: ${this.passedCount}`);
    console.log(`Failed: ${this.testCount - this.passedCount}`);
    console.log(`Success Rate: ${((this.passedCount / this.testCount) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => console.log(result));
    
    if (this.passedCount === this.testCount) {
      console.log('\n🎉 All tests passed! Your notification system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Export for use in other files
export default NotificationTestSuite;

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  const testSuite = new NotificationTestSuite();
  testSuite.runAllTests();
}
