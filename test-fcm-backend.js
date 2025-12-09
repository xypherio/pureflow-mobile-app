#!/usr/bin/env node

/**
 * FCM Server Backend Testing Script
 * Test the FCM server endpoints including broadcast functionality
 */

const fetch = require("node-fetch");
const fs = require("fs");

// Configuration - Update these with your actual values
const FCM_CONFIG = {
  // In test-fcm-backend.js, update line:
  SERVER_URL:
    'https://fcm-server-3x63pr2m8-xyphers-projects-a3902ca1.vercel.app/api', // Or your deployed URL
  API_KEY: "PUREFLOW_FCM_API_SECURE_123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ_2024", // Matches FCM server .env
  FCM_TOKEN: "your-test-fcm-token-here", // You'll need a real FCM token
};

/**
 * Test server health
 */
async function testHealth() {
  console.log("🩺 Testing server health...");
  try {
    const response = await fetch(`${FCM_CONFIG.SERVER_URL}/`);
    const data = await response.json();

    if (data.status === "healthy") {
      console.log("✅ Server is healthy");
      console.log(`   Version: ${data.version}`);
      console.log(`   Uptime: ${data.uptime?.toFixed(0)} seconds`);
      console.log(`   Firebase: ${data.firebase}`);
      return true;
    } else {
      console.log("❌ Server reported unhealthy status");
      return false;
    }
  } catch (error) {
    console.log("❌ Could not connect to server:", error.message);
    return false;
  }
}

/**
 * Test FCM token registration
 */
async function testRegistration(fcmToken, userData = {}) {
  console.log("📝 Testing FCM token registration...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCM_CONFIG.API_KEY,
    },
    body: JSON.stringify({
      fcmToken,
      userData: {
        userId: userData.userId || "test-user-123",
        platform: userData.platform || "test",
        deviceInfo: {
          appVersion: "4.2.0-test",
          ...userData.deviceInfo,
        },
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Token registration successful");
    console.log(`   Token last seen: ${data.lastSeen}`);
    return true;
  } else {
    console.log("❌ Token registration failed:", data.message);
    return false;
  }
}

/**
 * Send test notification to a specific device
 */
async function testSendNotification(
  fcmToken,
  title = "Test Notification",
  body = "This is a test from FCM server"
) {
  console.log("📤 Testing single device notification...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCM_CONFIG.API_KEY,
    },
    body: JSON.stringify({
      fcmToken,
      title,
      body,
      data: {
        type: "test_notification",
        timestamp: new Date().toISOString(),
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Notification sent successfully");
    console.log(`   Message ID: ${data.messageId}`);
    return true;
  } else {
    console.log("❌ Notification failed:", data.message);
    return false;
  }
}

/**
 * Test broadcast notification
 */
async function testBroadcast(
  title = "Broadcast Test",
  body = "This is a broadcast test message"
) {
  console.log("📢 Testing broadcast notification...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCM_CONFIG.API_KEY,
    },
    body: JSON.stringify({
      title,
      body,
      data: {
        broadcastId: `test-broadcast-${Date.now()}`,
        sentAt: new Date().toISOString(),
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Broadcast sent successfully");
    console.log(`   Total recipients: ${data.totalRecipients}`);
    console.log(`   Successful sends: ${data.successfulSends}`);
    console.log(`   Failed sends: ${data.failedSends}`);

    // Show detailed results if available
    if (data.results && data.results.length > 0) {
      console.log("   Details:");
      data.results.forEach((result, index) => {
        const status = result.success ? "✅" : "❌";
        console.log(
          `     ${index + 1}. ${result.token} (${result.platform}) - ${status}`
        );
      });
    }

    return true;
  } else {
    console.log("❌ Broadcast failed:", data.message);
    return false;
  }
}

/**
 * Test water quality alert notification
 */
async function testWaterQualityAlert(fcmToken, sensorData) {
  console.log("🌊 Testing water quality alert notification...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCM_CONFIG.API_KEY,
    },
    body: JSON.stringify({
      fcmToken,
      sensorData: sensorData || {
        pH: 7.2,
        temperature: 28.5,
        tds: 450,
        turbidity: 2.1,
        oxygen: 6.2,
        status: "warning",
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Water quality alert sent successfully");
    console.log(`   Message ID: ${data.messageId}`);
    return true;
  } else {
    console.log("❌ Water quality alert failed:", data.message);
    return false;
  }
}

/**
 * Test maintenance reminder
 */
async function testMaintenanceReminder(fcmToken, reminderData) {
  console.log("🔧 Testing maintenance reminder...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/maintenance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCM_CONFIG.API_KEY,
    },
    body: JSON.stringify({
      fcmToken,
      reminderData: reminderData || {
        type: "filter_cleaning",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Time to clean water filters",
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Maintenance reminder sent successfully");
    console.log(`   Message ID: ${data.messageId}`);
    return true;
  } else {
    console.log("❌ Maintenance reminder failed:", data.message);
    return false;
  }
}

/**
 * Get server information
 */
async function testServerInfo() {
  console.log("📋 Getting server information...");

  const response = await fetch(`${FCM_CONFIG.SERVER_URL}/info`);
  const data = await response.json();

  if (data.success) {
    console.log("✅ Server information retrieved");
    console.log(`   Service: ${data.service}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Endpoints: ${data.endpoints.join(", ")}`);
    console.log(
      `   Notification Types: ${data.supportedNotificationTypes.join(", ")}`
    );
    return data;
  } else {
    console.log("❌ Could not get server information");
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Starting FCM Server Backend Tests\n");
  console.log("=".repeat(50));

  // Check configuration
  if (FCM_CONFIG.FCM_TOKEN === "your-test-fcm-token-here") {
    console.log(
      "⚠️  WARNING: Using placeholder FCM token. Tests requiring tokens will be skipped."
    );
    console.log(
      '   To get a real FCM token, run the app and check the console logs for "FCM token obtained"\n'
    );
  }

  const results = {
    health: false,
    registration: false,
    send: false,
    broadcast: false,
    alert: false,
    maintenance: false,
    info: false,
  };

  // Test 1: Server Health
  results.health = await testHealth();
  console.log("");

  // Test 2: Server Info
  const info = await testServerInfo();
  results.info = info !== null;
  console.log("");

  // Test 3: Token Registration (if token available)
  if (FCM_CONFIG.FCM_TOKEN !== "your-test-fcm-token-here") {
    results.registration = await testRegistration(FCM_CONFIG.FCM_TOKEN, {
      userId: "test-user-123",
      platform: "nodejs-test",
    });
    console.log("");
  } else {
    console.log("⏭️  Skipping token registration (no token provided)\n");
  }

  // Test 4: Broadcast (works even without registration)
  results.broadcast = await testBroadcast(
    "FCM Server Test Broadcast",
    "This is a test broadcast message sent from the FCM server testing script"
  );
  console.log("");

  // Test 5: Single Device Notification
  if (FCM_CONFIG.FCM_TOKEN !== "your-test-fcm-token-here") {
    results.send = await testSendNotification(FCM_CONFIG.FCM_TOKEN);
    console.log("");
  } else {
    console.log(
      "⏭️  Skipping single device notification (no token provided)\n"
    );
  }

  // Test 6: Water Quality Alert
  if (FCM_CONFIG.FCM_TOKEN !== "your-test-fcm-token-here") {
    results.alert = await testWaterQualityAlert(FCM_CONFIG.FCM_TOKEN);
    console.log("");
  } else {
    console.log("⏭️  Skipping water quality alert (no token provided)\n");
  }

  // Test 7: Maintenance Reminder
  if (FCM_CONFIG.FCM_TOKEN !== "your-test-fcm-token-here") {
    results.maintenance = await testMaintenanceReminder(FCM_CONFIG.FCM_TOKEN);
    console.log("");
  } else {
    console.log("⏭️  Skipping maintenance reminder (no token provided)\n");
  }

  // Summary
  console.log("=".repeat(50));
  console.log("📊 TEST RESULTS SUMMARY:");
  console.log("=".repeat(50));

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\nOverall: ${passedCount}/${totalCount} tests passed`);

  if (passedCount < totalCount) {
    console.log("\n🔧 TO FIX FAILING TESTS:");
    console.log(
      "1. Make sure FCM server is running: cd fcm-server && npm start"
    );
    console.log("2. Update FCM_CONFIG with your actual server URL and API key");
    console.log("3. Get a real FCM token from your running app");
    console.log("4. Check FCM server logs for detailed error messages");
  }

  console.log("\n🎯 For broadcast testing on production:");
  console.log("curl -X POST https://your-server-url.com/api/broadcast \\");
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "x-api-key: your-api-key" \\');
  console.log('  -d \'{"title": "Hello", "body": "Broadcast test"}\'');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealth,
  testRegistration,
  testSendNotification,
  testBroadcast,
  testWaterQualityAlert,
  testMaintenanceReminder,
  testServerInfo,
};
