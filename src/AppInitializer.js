import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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

        // Initialize basic notification manager and request permissions
        await notificationManager.initialize();
        const permissionResult = await notificationManager.requestPermissions();
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

        setProgress('Initializing Firebase Cloud Messaging...');
        // Initialize FCM service (this will request FCM permissions and get token)
        try {
          await fcmService.initialize();
          console.log('✅ FCM service initialized successfully');
        } catch (fcmError) {
          console.warn('⚠️ FCM service initialization failed, continuing without FCM:', fcmError.message);
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
