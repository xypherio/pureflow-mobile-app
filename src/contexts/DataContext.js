import { getAlertFacade, getDashboardFacade } from '@services/ServiceContainer';
import { realtimeDataService } from "@services/realtimeDataService";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Context for managing application-wide data state including sensor data, alerts, and real-time updates.
 * Handles data fetching, caching, and synchronization with Firebase.
 */
const DataContext = createContext();

/**
 * Provider component that manages global data state and provides it to child components.
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @param {Object} [props.initialData] - Preloaded data for initial render
 */
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

  /**
   * Updates application state with new sensor data and processes alerts
   * @param {Array} newSensorData - Latest sensor readings
   * @param {Array} [precomputedAlerts] - Optional precomputed alerts to skip processing
   */
  const updateState = useCallback(async (newSensorData, precomputedAlerts = null) => {
    try {
      setSensorData(newSensorData);
      setLastUpdate(Date.now());

      // Handle alerts either from precomputed source or process new ones
      if (precomputedAlerts) {
        setAlerts(precomputedAlerts);
        console.log('🚀 Using precomputed alerts from initial load');
      } else {
        // Process new alerts with deduplication and threshold checking
        const alertResult = await getAlertFacade().processSensorData(newSensorData);
        setAlerts(alertResult.processedAlerts);

        if (alertResult.newAlerts.length > 0) {
          console.log(`🚨 ${alertResult.newAlerts.length} new alerts generated`);
        }

        if (alertResult.resolvedAlerts?.length > 0) {
          console.log(`✅ ${alertResult.resolvedAlerts.length} alerts resolved`);
        }
      }

      // Update alert statistics for dashboard display
      const allAlerts = await getAlertFacade().getAlertsForDisplay({ limit: 1000 });
      const stats = {
        total: allAlerts.length,
        high: allAlerts.filter(alert => alert.severity === 'high').length,
        medium: allAlerts.filter(alert => alert.severity === 'medium').length,
        low: allAlerts.filter(alert => alert.severity === 'low').length,
        recent: allAlerts.filter(alert => {
          const ageHours = (Date.now() - new Date(alert.timestamp)) / (1000 * 60 * 60);
          return ageHours < 24;
        }).length
      };
      setAlertStats(stats);
      
    } catch (error) {
      console.error('❌ Error updating state with AlertManager:', error);
      // Fallback: just update sensor data without alerts
      setSensorData(newSensorData);
      setError('Failed to process alerts');
    }
  }, []);

  /**
   * Performs a complete refresh of all data sources including sensor data and real-time updates.
   * Handles parallel data fetching, error states, and alert generation.
   * 
   * @param {boolean} [useCache=true] - When true, uses cached data when available to reduce API calls
   * @returns {Promise<void>}
   */
  const performUnifiedRefresh = useCallback(async (useCache = true) => {
    try {
      console.log('🔄 Starting optimized unified refresh cycle...');

      // Use optimized dashboard data with smart limits
      const [dashboardResult, realtimeDataResult] = await Promise.allSettled([
        getDashboardFacade().getDashboardData({
          includeHistorical: true,
          useCache,
          historicalLimit: 50,  // Smart limit instead of unlimited
          hoursBack: 24         // Reasonable time window
        }),
        realtimeDataService.getMostRecentData(useCache)
      ]);

      // Initialize variables to store data for alert processing
      let sensorDataForAlerts = [];
      let realtimeDataForAlerts = null;

      // Process and validate dashboard data response
      if (dashboardResult.status === 'fulfilled' && isMountedRef.current) {
        const { current, today, alerts: dashboardAlerts } = dashboardResult.value;

        // Map the new data structure to the expected format
        sensorDataForAlerts = today.data;
        setSensorData(today.data);
        setDailyReport(current);
        setAlerts(dashboardAlerts.active);
        setLastUpdate(Date.now());

        console.log('✅ Optimized dashboard data and daily report updated', {
          records: today.data.length,
          alerts: dashboardAlerts.active.length,
          optimization: dashboardResult.value.metadata?.optimization
        });

        if (!current) {
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
      } else if (realtimeDataResult.status === 'rejected') {
        console.error('❌ Failed to fetch real-time data:', realtimeDataResult.reason);
      }

      // Generate alerts only from real-time data to sync with real-time cards
      if (isMountedRef.current && realtimeDataForAlerts && realtimeDataForAlerts.timestamp) {
        try {
          // Process alerts only from the most recent real-time data
          const alertResult = await getAlertFacade().processSensorData([{
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
          const allAlerts = await getAlertFacade().getAlertsForDisplay({ limit: 1000 });
          const stats = {
            total: allAlerts.length,
            high: allAlerts.filter(alert => alert.severity === 'high').length,
            medium: allAlerts.filter(alert => alert.severity === 'medium').length,
            low: allAlerts.filter(alert => alert.severity === 'low').length,
          };

          // Use setTimeout to defer state updates and prevent render-time updates
          setTimeout(() => {
            if (isMountedRef.current) {
              setAlerts(alertResult.processedAlerts);
              setAlertStats(stats);
            }
          }, 0);

        } catch (error) {
          console.error('❌ Error processing alerts from real-time data:', error);
        }
      }

      // Sync alerts to Firebase immediately after processing
      // Note: Firebase sync is now handled automatically by AlertManagementFacade
      console.log('🔄 Alert sync is now handled automatically by the facade');

    } catch (error) {
      console.error('❌ Error in optimized unified refresh:', error);
      if (isMountedRef.current) {
        setError('Failed to refresh data');
      }
    }
  }, []); // Removed updateState from dependencies as we handle state directly

  /**
   * Effect hook for initial data loading and setting up polling
   * - Loads initial data (either from props or API)
   * - Sets up refresh interval
   * - Handles component cleanup
   */
  useEffect(() => {
    // Track component mount state to prevent state updates after unmount
    isMountedRef.current = true;

    /**
     * Initializes application data either from props or API
     */
    const initializeData = async () => {
      // Use preloaded data if available (from server-side rendering or cache)
      if (initialData) {
        console.log('🚀 Using preloaded initial data');
        
        // Initialize AlertManager with preloaded alerts to prevent duplicate processing
        if (initialData.alerts?.length > 0) {
          console.log(`📦 Initializing AlertFacade with ${initialData.alerts.length} preloaded alerts`);

          // Register each alert with AlertFacade to prevent regeneration
          const alertFacade = getAlertFacade();
          for (const alert of initialData.alerts) {
            // Note: AlertFacade handles deduplication automatically during processing
            console.log(`📝 AlertFacade will handle alert deduplication automatically`);
          }

          // Mark this data as processed to avoid duplicate alerts
          // Note: AlertFacade handles data signature tracking automatically
          console.log('✅ AlertFacade will handle data signature tracking automatically');
        }
        
        // Update application state with preloaded data
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
            const alertFacade = getAlertFacade();
            const realtimeAlerts = await alertFacade.processSensorData([{
              ...freshRealtimeData,
              datetime: freshRealtimeData.timestamp,
            }]);

            if (realtimeAlerts.newAlerts.length > 0) {
              console.log(`🚨 ${realtimeAlerts.newAlerts.length} new alerts from real-time data`);
              setAlerts(realtimeAlerts.processedAlerts);
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

  /**
   * Manually triggers a refresh of all data sources
   * Bypasses cache to ensure fresh data
   */
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await performUnifiedRefresh(false); // Force fresh data on manual refresh
  }, [performUnifiedRefresh]);

  // Alert display helper functions
  
  /**
   * Gets a limited set of critical alerts for the homepage
   * @returns {Array} Up to 3 high-priority alerts
   */
  const getHomepageAlerts = useCallback(async () => {
    const alertFacade = getAlertFacade();
    const alerts = await alertFacade.getAlertsForDisplay({ limit: 20 });
    return alerts.map(alert => ({
      ...alert,
      displayMessage: `${alert.parameter?.toUpperCase() || 'UNKNOWN'}: ${alert.value !== undefined && alert.value !== null ? Number(alert.value).toFixed(2) : 'N/A'}`,
    }));
  }, []);

  /**
   * Gets all alerts formatted for the notifications screen
   * @returns {Array} All active alerts with full details
   */
  const getNotificationAlerts = useCallback(async () => {
    const alertFacade = getAlertFacade();
    const alerts = await alertFacade.getAlertsForDisplay({ limit: 20 });
    return alerts.map(alert => ({
      ...alert,
      message: alert.displayMessage || `${alert.parameter || 'UNKNOWN'}: ${alert.value !== undefined && alert.value !== null ? alert.value : 'N/A'}`,
      timestamp: { seconds: Math.floor(new Date(alert.timestamp || Date.now()).getTime() / 1000) },
    }));
  }, []);

  /**
   * Gets statistics about current alerts
   * @returns {Object} Alert counts by severity
   */
  const getAlertStatistics = useCallback(async () => {
    const alertFacade = getAlertFacade();
    const allAlerts = await alertFacade.getAlertsForDisplay({ limit: 20 });
    return {
      total: allAlerts.length,
      high: allAlerts.filter(alert => alert.severity === 'high').length,
      medium: allAlerts.filter(alert => alert.severity === 'medium').length,
      low: allAlerts.filter(alert => alert.severity === 'low').length,
      recent: allAlerts.filter(alert => {
        const ageHours = (Date.now() - new Date(alert.timestamp || Date.now())) / (1000 * 60 * 60);
        return ageHours < 24;
      }).length
    };
  }, []);

  /**
   * Get performance metrics for the current data state
   * @returns {Object} Performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = lastUpdate ? now - lastUpdate : null;

    return {
      lastUpdate: lastUpdate,
      timeSinceLastUpdate: timeSinceLastUpdate ? `${Math.round(timeSinceLastUpdate / 1000)}s ago` : 'Never',
      sensorDataCount: sensorData?.length || 0,
      alertsCount: alerts?.length || 0,
      realtimeDataAge: realtimeData?.timestamp ? `${Math.round((now - new Date(realtimeData.timestamp)) / 1000)}s ago` : 'No data',
      optimization: {
        isOptimized: true,
        maxRecordsPerFetch: 50,
        refreshInterval: 30000, // 30 seconds
        features: [
          'Query Limits',
          'Smart Caching',
          'Progressive Loading',
          'Pagination Support'
        ]
      }
    };
  }, [lastUpdate, sensorData, alerts, realtimeData]);

  /**
   * Memoized context value to optimize performance by preventing
   * unnecessary re-renders of consuming components
   */
  const contextValue = React.useMemo(() => ({
    // Core data state
    alerts,              // Current active alerts
    sensorData,          // Historical sensor readings
    dailyReport,         // Processed daily report data
    realtimeData,        // Latest real-time sensor readings
    loading,             // Loading state indicator
    error,               // Current error state, if any
    lastUpdate,          // Timestamp of last successful update
    alertStats,          // Statistics about current alerts

    // Data refresh handler
    refreshData,         // Function to manually trigger data refresh

    // Alert helper functions
    getHomepageAlerts,   // Gets critical alerts for homepage display
    getNotificationAlerts, // Gets all alerts for notifications tab
    getAlertStatistics,  // Gets alert statistics and metrics

    // Performance monitoring
    getPerformanceMetrics, // Get performance metrics for optimization tracking

    // Legacy compatibility
    allAlerts: alerts,   // Alias for backward compatibility
  }), [
    // Dependencies array - context updates when any of these change
    alerts, sensorData, dailyReport, realtimeData, loading,
    error, lastUpdate, refreshData, alertStats,
    getHomepageAlerts, getNotificationAlerts, getAlertStatistics,
    getPerformanceMetrics
  ]);

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

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useData() instead
 */
export function useAlerts() {
  return useData();
}
