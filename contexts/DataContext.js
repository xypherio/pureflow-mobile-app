import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { alertManager } from "../backend/services/alertManager";
import dataPreloader from "../backend/services/dataPreloader";
import { realtimeDataService } from "../backend/services/realtimeDataService";

const DataContext = createContext();

export function DataProvider({ children, initialData = null }) {
  const [alerts, setAlerts] = useState(initialData?.alerts || []);
  const [sensorData, setSensorData] = useState(initialData?.sensorData || []);
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
        setLastUpdate(Date.now());
        console.log('✅ Sensor data updated');
      } else if (sensorDataResult.status === 'rejected') {
        console.error('❌ Failed to fetch sensor data:', sensorDataResult.reason);
      }
      
      // Process real-time data
      if (realtimeDataResult.status === 'fulfilled' && isMountedRef.current) {
        realtimeDataForAlerts = realtimeDataResult.value;
        setRealtimeData(realtimeDataForAlerts);
        console.log('✅ Real-time data updated');
      } else if (realtimeDataResult.status === 'rejected') {
        console.error('❌ Failed to fetch real-time data:', realtimeDataResult.reason);
      }
      
      // Generate alerts from both sensor data and real-time data
      if (isMountedRef.current) {
        try {
          // Combine sensor data and real-time data for alert processing
          let combinedDataForAlerts = [...sensorDataForAlerts];
          
          // Add real-time data as the most recent entry if available
          if (realtimeDataForAlerts && realtimeDataForAlerts.timestamp) {
            combinedDataForAlerts.push({
              ...realtimeDataForAlerts,
              // Ensure real-time data has the correct format for alert processing
              datetime: realtimeDataForAlerts.timestamp,
            });
          }
          
          // Process alerts with combined data
          const alertResult = await alertManager.processAlertsFromSensorData(combinedDataForAlerts);
          
          if (alertResult.newAlerts.length > 0) {
            console.log(`🚨 ${alertResult.newAlerts.length} new alerts generated (including real-time data)`);
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
          console.error('❌ Error processing alerts from combined data:', error);
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
      // If we have initial data, use it immediately
      if (initialData) {
        console.log('🚀 Using preloaded initial data');
        await updateState(initialData.sensorData, initialData.alerts);
        
        // Still fetch fresh real-time data even with preloaded data
        try {
          const freshRealtimeData = await realtimeDataService.getMostRecentData(false);
          setRealtimeData(freshRealtimeData);
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
  }), [alerts, sensorData, realtimeData, loading, error, lastUpdate, refreshData, alertStats, getHomepageAlerts, getNotificationAlerts, getAlertStatistics]);

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
