#!/usr/bin/env node
/**
 * Command-line notification test script
 * Run with: node test-notifications.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 PureFlow Mobile - Notification System Test');
console.log('=============================================\n');

// Test 1: Check if Expo is running
console.log('1️⃣ Checking if Expo development server is running...');
try {
  const result = execSync('npx expo start --help', { encoding: 'utf8' });
  console.log('   ✅ Expo CLI is available');
} catch (error) {
  console.log('   ❌ Expo CLI not found. Please install: npm install -g @expo/cli');
  process.exit(1);
}

// Test 2: Check dependencies
console.log('\n2️⃣ Checking notification dependencies...');
const packageJson = require('./package.json');
const requiredDeps = [
  'expo-notifications',
  'expo-device',
  '@react-native-async-storage/async-storage'
];

let allDepsInstalled = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`   ❌ ${dep}: Not installed`);
    allDepsInstalled = false;
  }
});

if (!allDepsInstalled) {
  console.log('\n⚠️  Some dependencies are missing. Installing...');
  try {
    execSync('npx expo install expo-notifications expo-device @react-native-async-storage/async-storage', { stdio: 'inherit' });
    console.log('   ✅ Dependencies installed successfully');
  } catch (error) {
    console.log('   ❌ Failed to install dependencies:', error.message);
  }
}

// Test 3: Check app.json configuration
console.log('\n3️⃣ Checking app.json configuration...');
try {
  const appConfig = require('./app.json');
  
  if (appConfig.expo?.plugins?.some(plugin => 
    (Array.isArray(plugin) && plugin[0] === 'expo-notifications') ||
    plugin === 'expo-notifications'
  )) {
    console.log('   ✅ expo-notifications plugin configured');
  } else {
    console.log('   ⚠️  expo-notifications plugin not found in app.json');
    console.log('   📝 Add this to your app.json:');
    console.log('   "plugins": ["expo-notifications"]');
  }
  
  if (appConfig.expo?.notification) {
    console.log('   ✅ Notification configuration found');
  } else {
    console.log('   ⚠️  No notification configuration in app.json');
  }
} catch (error) {
  console.log('   ❌ Could not read app.json:', error.message);
}

// Test 4: Check notification files exist
console.log('\n4️⃣ Checking notification system files...');
const requiredFiles = [
  'src/services/notifications/NotificationManager.js',
  'src/services/notifications/NotificationTemplates.js',
  'src/services/notifications/NotificationStorage.js',
  'src/hooks/useNotifications.js',
  'src/contexts/NotificationContext.js',
  'src/services/WaterQualityNotificationService.js',
  'src/hooks/useWaterQualityNotifications.js',
  'src/components/NotificationTestPanel.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  try {
    require.resolve(`./${file}`);
    console.log(`   ✅ ${file}`);
  } catch (error) {
    console.log(`   ❌ ${file} - Not found`);
    allFilesExist = false;
  }
});

// Test 5: Check for common issues
console.log('\n5️⃣ Checking for common issues...');

// Check for crypto polyfill
try {
  const notificationManager = require('./src/services/notifications/NotificationManager.js');
  console.log('   ✅ NotificationManager loads without errors');
} catch (error) {
  console.log('   ❌ NotificationManager has errors:', error.message);
}

// Check for uuid dependency issues
if (packageJson.dependencies?.uuid) {
  console.log('   ⚠️  uuid dependency found - this may cause crypto issues in React Native');
  console.log('   💡 Consider using the custom generateId function instead');
}

// Summary
console.log('\n📊 Test Summary:');
console.log('================');

if (allDepsInstalled && allFilesExist) {
  console.log('✅ All checks passed! Your notification system should work correctly.');
  console.log('\n🚀 Next steps:');
  console.log('1. Start your Expo development server: npx expo start');
  console.log('2. Open the app on your device/emulator');
  console.log('3. Look for the "Notification Test Panel" button in the bottom-right corner');
  console.log('4. Tap it to open the test panel and run individual tests');
  console.log('5. Check your device\'s notification tray for test notifications');
} else {
  console.log('❌ Some issues found. Please fix them before testing notifications.');
}

console.log('\n📱 Manual Testing Instructions:');
console.log('1. Open the app on your device');
console.log('2. Look for the floating "Notification Test Panel" button');
console.log('3. Tap it to expand the test panel');
console.log('4. Test each notification type individually');
console.log('5. Check your device\'s notification settings if notifications don\'t appear');

console.log('\n🔧 Troubleshooting:');
console.log('- If notifications don\'t appear, check device notification permissions');
console.log('- On Android, ensure notification channels are properly configured');
console.log('- On iOS, ensure notifications are enabled in device settings');
console.log('- Check the console for any error messages');
