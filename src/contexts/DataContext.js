import { getWaterQualityThresholds } from "@constants/thresholds";
import { alertManager } from "@services/alertManager";
import dataPreloader from "@services/dataPreloader";
import { notificationEvents, registerForPushNotificationsAsync } from "@services/pushNotifications";
import { realtimeDataService } from "@services/realtimeDataService";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const DataContext = createContext();

export function DataProvider({ children, initialData = null }) {
  const [alerts, setAlerts] = useState(initialData?.alerts || []);
  const [sensorData, setSensorData] = useState(initialData?.sensorData || []);
  const [dailyReport, setDailyReport] = useState(initialData?.dailyReport || null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(initialData ? Date.now() : null);
  const [alertStats, setAlertStats] = useState(null);
  
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const syncIntervalRef = useRef(null);

  // Enhanced state update function with AlertManager integration
  const updateState = useCallback(async (newSensorData, precomputedAlerts = null) => {
    try {
      setSensorData(newSensorData);
      setLastUpdate(Date.now());

      // Process alerts using AlertManager for proper deduplication
      let alertResult;
      if (precomputedAlerts) {
        // Use precomputed alerts from initial load
        setAlerts(precomputedAlerts);
        console.log('🚀 Using precomputed alerts from initial load');
      } else {
        // Process alerts with deduplication
        alertResult = await alertManager.processAlertsFromSensorData(newSensorData);
        setAlerts(alertResult.alerts);
        
        if (alertResult.newAlerts.length > 0) {
          console.log(`🚨 ${alertResult.newAlerts.length} new alerts generated`);
        }
        
        if (alertResult.resolvedAlerts && alertResult.resolvedAlerts.length > 0) {
          console.log(`✅ ${alertResult.resolvedAlerts.length} alerts resolved`);
        }
      }

      // Update alert statistics
      const stats = alertManager.getStatistics();
      setAlertStats(stats);
      
    } catch (error) {
      console.error('❌ Error updating state with AlertManager:', error);
      // Fallback: just update sensor data without alerts
      setSensorData(newSensorData);
      setError('Failed to process alerts');
    }
  }, []);

  // Optimized unified refresh function
  const performUnifiedRefresh = useCallback(async (useCache = true) => {
    try {
      console.log('🔄 Starting unified refresh cycle...');
      
      // Fetch both sensor data and real-time data in parallel
      const [sensorDataResult, realtimeDataResult] = await Promise.allSettled([
        dataPreloader.preloadData(useCache),
        realtimeDataService.getMostRecentData(useCache)
      ]);
      
      let sensorDataForAlerts = [];
      let realtimeDataForAlerts = null;
      
      // Process sensor data
      if (sensorDataResult.status === 'fulfilled' && isMountedRef.current) {
        const data = sensorDataResult.value;
        sensorDataForAlerts = data.sensorData;
        setSensorData(data.sensorData);
        setDailyReport(data.dailyReport);
        setLastUpdate(Date.now());
        console.log('✅ Sensor data and daily report updated');
        console.log('📊 Daily report in context:', data.dailyReport);
        if (!data.dailyReport) {
          console.warn('⚠️ Daily report is null/undefined in context update');
        }
      } else if (sensorDataResult.status === 'rejected') {
        console.error('❌ Failed to fetch sensor data:', sensorDataResult.reason);
      }
      
      // Process real-time data
      if (realtimeDataResult.status === 'fulfilled' && isMountedRef.current) {
        realtimeDataForAlerts = realtimeDataResult.value;
        setRealtimeData(realtimeDataForAlerts);
        console.log('✅ Real-time data updated');
        // Push notifications for rain detection and approaching unsafe thresholds
        try {
          if (realtimeDataForAlerts?.isRaining) {
            await notificationEvents.rainDetected();
          }
          const thresholds = getWaterQualityThresholds();
          const params = ["pH", "temperature", "turbidity", "salinity"];
          params.forEach((param) => {
            const t = thresholds[param];
            const value = realtimeDataForAlerts[param] ?? realtimeDataForAlerts[param?.toLowerCase?.()] ?? (param === 'pH' ? realtimeDataForAlerts['ph'] : realtimeDataForAlerts[param]);
            if (t && typeof value === 'number') {
              const margin = (t.max - t.min) * 0.1; // 10% of range
              if ((value > t.max - margin && value <= t.max) || (value < t.min + margin && value >= t.min)) {
                notificationEvents.parameterApproachingUnsafe(param, value, t);
              }
            }
          });
        } catch (e) {
          console.warn('Notification checks failed', e);
        }
      } else if (realtimeDataResult.status === 'rejected') {
        console.error('❌ Failed to fetch real-time data:', realtimeDataResult.reason);
      }
      
      // Generate alerts only from real-time data to sync with real-time cards
      if (isMountedRef.current && realtimeDataForAlerts && realtimeDataForAlerts.timestamp) {
        try {
          // Process alerts only from the most recent real-time data
          const alertResult = await alertManager.processAlertsFromSensorData([{
            ...realtimeDataForAlerts,
            datetime: realtimeDataForAlerts.timestamp,
          }]);
          
          if (alertResult.newAlerts.length > 0) {
            console.log(`🚨 ${alertResult.newAlerts.length} new alerts from real-time data refresh`);
          }
          
          if (alertResult.resolvedAlerts && alertResult.resolvedAlerts.length > 0) {
            console.log(`✅ ${alertResult.resolvedAlerts.length} alerts resolved`);
          }
          
          // Batch state updates to prevent useInsertionEffect errors
          const stats = alertManager.getStatistics();
          
          // Use setTimeout to defer state updates and prevent render-time updates
          setTimeout(() => {
            if (isMountedRef.current) {
              setAlerts(alertResult.alerts);
              setAlertStats(stats);
            }
          }, 0);
          
        } catch (error) {
          console.error('❌ Error processing alerts from real-time data:', error);
        }
      }
      
      // Sync alerts to Firebase immediately after processing
      try {
        const syncResult = await alertManager.syncAlertsToFirebase();
        if (syncResult.synced > 0) {
          console.log(`🔄 Synced ${syncResult.synced} alerts to Firebase`);
        }
      } catch (syncError) {
        console.warn('⚠️ Failed to sync alerts to Firebase:', syncError);
      }
      
    } catch (error) {
      console.error('❌ Error in unified refresh:', error);
      if (isMountedRef.current) {
        setError('Failed to refresh data');
      }
    }
  }, [updateState]);

  // Initialize data and set up polling
  useEffect(() => {
    isMountedRef.current = true;

    const initializeData = async () => {
      // Initialize push notifications
      try {
        await registerForPushNotificationsAsync();
      } catch (e) {
        console.warn('Push notification registration failed', e);
      }
      // If we have initial data, use it immediately
      if (initialData) {
        console.log('🚀 Using preloaded initial data');
        
        // Initialize AlertManager with preloaded alerts to prevent reprocessing
        if (initialData.alerts && initialData.alerts.length > 0) {
          console.log(`📦 Initializing AlertManager with ${initialData.alerts.length} preloaded alerts`);
          // Set the alerts directly in AlertManager to prevent regeneration
          for (const alert of initialData.alerts) {
            const signature = alertManager.generateAlertSignature(alert);
            alertManager.activeAlerts.set(signature, alert);
          }
          // Mark the sensor data as already processed
          const dataSignature = alertManager.generateDataSignature(initialData.sensorData);
          alertManager.alertHistory.add(dataSignature);
        }
        
        // Set initial state with preloaded data
        setSensorData(initialData.sensorData);
        setAlerts(initialData.alerts || []);
        setDailyReport(initialData.dailyReport || null);
        setLastUpdate(Date.now());
        
        console.log('📊 Initial data set in context:', {
          sensorDataCount: initialData.sensorData?.length || 0,
          alertsCount: initialData.alerts?.length || 0,
          dailyReport: initialData.dailyReport,
          hasDailyReport: !!initialData.dailyReport,
          chartData: initialData.dailyReport?.chartData,
          chartLabels: initialData.dailyReport?.chartData?.labels?.length || 0,
          chartDataPoints: initialData.dailyReport?.chartData?.datasets?.[0]?.data?.length || 0
        });
        
        // Still fetch fresh real-time data even with preloaded data
        try {
          const freshRealtimeData = await realtimeDataService.getMostRecentData(false);
          setRealtimeData(freshRealtimeData);
          
          // Generate alerts immediately from real-time data to sync with real-time cards
          if (freshRealtimeData && freshRealtimeData.timestamp) {
            const realtimeAlerts = await alertManager.processAlertsFromSensorData([{
              ...freshRealtimeData,
              datetime: freshRealtimeData.timestamp,
            }]);
            
            if (realtimeAlerts.newAlerts.length > 0) {
              console.log(`🚨 ${realtimeAlerts.newAlerts.length} new alerts from real-time data`);
              setAlerts(realtimeAlerts.alerts);
              // Notify on new alerts
              for (const a of realtimeAlerts.newAlerts) {
                try { await notificationEvents.newAlert(a); } catch {}
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch fresh real-time data:', error);
        }
        
        setLoading(false);
      } else {
        // Perform initial unified refresh
        await performUnifiedRefresh(false);
        setLoading(false);
      }
    };

    initializeData();

    // Set up unified polling interval (every 30 seconds)
    intervalRef.current = setInterval(() => {
      performUnifiedRefresh(true);
    }, 30000);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performUnifiedRefresh, initialData, updateState]);

  // Manual refresh function using unified approach
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await performUnifiedRefresh(false); // Force fresh data on manual refresh
  }, [performUnifiedRefresh]);

  // Helper functions for different alert displays
  const getHomepageAlerts = useCallback(() => {
    return alertManager.getHomepageAlerts(3); // Limit to 3 for homepage
  }, []);

  const getNotificationAlerts = useCallback(() => {
    return alertManager.getNotificationAlerts();
  }, []);

  const getAlertStatistics = useCallback(() => {
    return alertManager.getStatistics();
  }, []);

  // Context value with memoization for performance
  const contextValue = React.useMemo(() => ({
    alerts,
    sensorData,
    dailyReport,
    realtimeData,
    loading,
    error,
    lastUpdate,
    refreshData,
    alertStats,
    // Alert helper functions
    getHomepageAlerts,
    getNotificationAlerts, 
    getAlertStatistics,
    // Legacy compatibility
    allAlerts: alerts,
  }), [alerts, sensorData, dailyReport, realtimeData, loading, error, lastUpdate, refreshData, alertStats, getHomepageAlerts, getNotificationAlerts, getAlertStatistics]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Legacy hook for backward compatibility
export function useAlerts() {
  return useData();
}
