import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { optimizedDataManager } from './services/OptimizedDataManager';
import { scheduledNotificationManager } from './services/notifications/ScheduledNotificationManager';
import { OptimizedDataProvider } from './contexts/OptimizedDataContext';
import { notificationManager } from './services/notifications/NotificationManager';
import { fcmService } from './services/firebase/fcmService';
import { notificationMonitor } from './services/notifications/NotificationMonitor';
import { fcmHttpService } from './services/fcmService';

export default function AppInitializer({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [progress, setProgress] = useState('Initializing...');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setProgress('Initializing notification system (reminders, alerts, monitoring)...');
        console.log('🚀 Starting app initialization...');

        // Initialize notification system first
        await scheduledNotificationManager.initialize();

        // Initialize basic notification manager and request permissions with Android guidance
        await notificationManager.initialize();
        const permissionResult = await notificationManager.requestPermissionsWithGuidance();
        if (permissionResult.success) {
          console.log('✅ Notification permissions granted automatically');
          console.log('🔍 Permission status:', permissionResult.status);

          // Get device token to verify it's working
          const tokenResult = await notificationManager.getDeviceToken(true); // Force refresh for logging
          if (tokenResult.success) {
            console.log('📱 Device token retrieved during init:', tokenResult.token);
          } else {
            console.error('❌ Failed to get device token during init:', tokenResult.reason || tokenResult.error);
          }
        } else {
          console.log('⚠️ Notification permissions not granted (user can grant later)');
          console.log('🔍 Permission status:', permissionResult.status);
        }

        console.log('🔧 DEBUG: Right before firebase cloud messaging section');
        setProgress('Initializing Firebase Cloud Messaging...');
        // Initialize FCM service (this will request FCM permissions and get token)
        console.log('🔧 DEBUG: About to initialize FCM...');

        // DEBUG: Check if FCM service is properly imported
        try {
          console.log('🔧 DEBUG: FCM service object:', typeof fcmService);
          console.log('� DEBUG: FCM service initialize method:', typeof fcmService?.initialize);
          console.log('🔧 DEBUG: FCM service imported from:', __filename);
        } catch (importError) {
          console.error('❌ FCM service import error:', importError.message);
        }

        console.log('�🔥 Starting FCM service initialization...');
        try {
          await fcmService.initialize();
          console.log('✅ FCM service initialized successfully');
        } catch (fcmError) {
          console.error('❌ FCM service initialization failed:', fcmError.message);
          console.error('❌ FCM INIT ERROR details:', fcmError);
          console.error('❌ FCM Error message:', fcmError.message);
          console.error('❌ FCM Error stack:', fcmError.stack);
          console.warn('⚠️ FCM initialization failed, push notifications may not work');
          // Log additional debugging info
          console.log('⚠️ Available Firebase config from constants:',
            Constants.expoConfig?.extra?.firebase);
          // Don't fail the entire app initialization if FCM fails
        }

        setProgress('Initializing FCM HTTP service...');
        // Initialize FCM HTTP service for server communications
        try {
          await fcmHttpService.initialize();
          console.log('✅ FCM HTTP service initialized successfully');
        } catch (fcmHttpError) {
          console.warn('⚠️ FCM HTTP service initialization failed, continuing without remote push:', fcmHttpError.message);
          // Continue without FCM HTTP service - app will still work with local notifications
        }

        setProgress('Setting up background message handler...');
        // Set up background message handler for FCM
        try {
          fcmService.setBackgroundMessageHandler(async (remoteMessage) => {
            console.log('🏠 Background FCM message received:', remoteMessage);

            // Convert FCM message to local notification format
            const localNotification = fcmService.convertFCMToLocalNotification(remoteMessage);
            if (localNotification) {
              console.log('📱 Converting FCM to local notification in background');
              await notificationManager.sendLocalNotification(localNotification);
            } else {
              console.warn('⚠️ Could not convert FCM message to local notification');
            }
          });
          console.log('✅ Background message handler set up');
        } catch (backgroundError) {
          console.warn('⚠️ Background message handler setup failed:', backgroundError.message);
        }

        setProgress('Verifying scheduled notifications...');
        // Verify scheduled notifications are active (already initialized above)
        try {
          const status = scheduledNotificationManager.getSchedulesStatus();
          console.log(`📊 Scheduled notifications status: ${status.totalActive} active, ${status.isInitialized ? 'initialized' : 'not initialized'}`);

          // Log current schedules for debugging
          if (status.schedules && Object.keys(status.schedules).length > 0) {
            console.log('📋 Current active schedules:');
            Object.entries(status.schedules).forEach(([id, schedule]) => {
              if (schedule.active) {
                console.log(`  • ${id}: ${schedule.trigger?.hour || 'N/A'}:${schedule.trigger?.minute?.toString().padStart(2, '0') || 'N/A'}`);
              }
            });
          } else {
            console.warn('⚠️ No active scheduled notifications found');
          }
        } catch (statusError) {
          console.warn('⚠️ Could not verify scheduled notification status:', statusError.message);
        }

        setProgress('Loading initial data...');
        // Initialize the optimized data manager
        await optimizedDataManager.initialize();

        setProgress('Prefetching recent alerts...');
        // Prefetch alerts for faster notifications tab loading
        const { historicalAlertsService } = await import('./services/historicalAlertsService');
        const prefetchResult = await historicalAlertsService.prefetchAlerts({ limitCount: 50 });
        if (prefetchResult.success) {
          console.log(`📡 Prefetched ${prefetchResult.count} alerts for immediate availability`);
        } else {
          console.warn('⚠️ Alert prefetch failed, will fetch on-demand:', prefetchResult.error);
        }

        setProgress('Initialization complete');
        setIsInitialized(true);

        console.log('✅ App initialization completed successfully');

      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setInitializationError(error.message || 'Failed to initialize app');
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      optimizedDataManager.destroy();
      scheduledNotificationManager.destroy();
    };
  }, []);

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2455a9" />
        <Text style={styles.progressText}>{progress}</Text>
        {initializationError && (
          <Text style={styles.errorText}>
            Error: {initializationError}
          </Text>
        )}
      </View>
    );
  }

  // Render the main app with optimized data provider
  return (
    <OptimizedDataProvider>
      {children}
    </OptimizedDataProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6fafd',
    padding: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#1a2d51',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 8,
    textAlign: 'center',
  },
});
