/**
 * App Initializer - Handles initial data loading during app launch
 * 
 * This component should be used at the root level to initialize the optimized data manager
 * and preload all necessary data before the main app components are rendered.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { optimizedDataManager } from './services/OptimizedDataManager';
import { scheduledNotificationManager } from './services/notifications/ScheduledNotificationManager';
import { OptimizedDataProvider } from './contexts/OptimizedDataContext';
import { notificationManager } from './services/notifications/NotificationManager';

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
        } else {
          console.log('⚠️ Notification permissions not granted (user can grant later)');
        }

        setProgress('Loading initial data...');
        // Initialize the optimized data manager
        await optimizedDataManager.initialize();

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
