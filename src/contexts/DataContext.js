import { getAlertFacade, getDashboardFacade } from '@services/ServiceContainer';
import { realtimeDataService } from "@services/realtimeDataService";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
  const realtimeIntervalRef = useRef(null);
  const realtimeUnsubscriberRef = useRef(null); // Real-time Firebase listener
  const isMountedRef = useRef(true);
  const syncIntervalRef = useRef(null);
  const isRefreshing = useRef(false);
  const lastRefreshTime = useRef(0);
  const lastProcessedDataSignature = useRef(null);

  /**
   * Generates a signature for sensor data to detect changes in actual values
   * Only considers actual sensor parameter values, not timestamps
   * @param {Object} sensorData - Sensor data object
   * @returns {string} Data signature based on values only
   */
  const generateDataSignature = useCallback((sensorData) => {
    if (!sensorData) return null;

    // Extract and normalize sensor values for signature (round to 2 decimal places to reduce false changes)
    const normalizeValue = (value) => {
      if (value === null || value === undefined || isNaN(value)) return null;
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    };

    const signature = {
      pH: normalizeValue(sensorData.pH),
      temperature: normalizeValue(sensorData.temperature),
      turbidity: normalizeValue(sensorData.turbidity),
      salinity: normalizeValue(sensorData.salinity)
    };

    return JSON.stringify(signature);
  }, []);

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
   * 
   * @param {boolean} [useCache=true] - When true, uses cached data when available
   * @returns {Promise<void>}
   */
  const performUnifiedRefresh = useCallback(async (useCache = true) => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing.current) {
      console.log('⏳ Refresh already in progress, skipping duplicate request');
      return;
    }

    const refreshId = Date.now();
    isRefreshing.current = true;
    
    try {
      console.log(`🔄 [${refreshId}] Starting optimized refresh (cache: ${useCache ? 'enabled' : 'disabled'})`);

      // Use optimized dashboard data with smart limits
      const [dashboardResult, realtimeDataResult] = await Promise.allSettled([
        getDashboardFacade().getDashboardData({
          includeHistorical: true,
          useCache: true, 
          historicalLimit: 30, 
          hoursBack: 24      
        }),
        realtimeDataService.getMostRecentData({
          useCache: true,      
          cacheTtl: 30000    
        })
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
      // Only process alerts when we have meaningful data (not null/undefined values)
      if (isMountedRef.current && realtimeDataForAlerts && realtimeDataForAlerts.timestamp) {
        // Check if we have at least some valid, non-null parameter values
        const hasValidData = (
          (realtimeDataForAlerts.pH !== null && realtimeDataForAlerts.pH !== undefined && !isNaN(realtimeDataForAlerts.pH)) ||
          (realtimeDataForAlerts.temperature !== null && realtimeDataForAlerts.temperature !== undefined && !isNaN(realtimeDataForAlerts.temperature)) ||
          (realtimeDataForAlerts.turbidity !== null && realtimeDataForAlerts.turbidity !== undefined && !isNaN(realtimeDataForAlerts.turbidity)) ||
          (realtimeDataForAlerts.salinity !== null && realtimeDataForAlerts.salinity !== undefined && !isNaN(realtimeDataForAlerts.salinity))
        );

        if (hasValidData) {
          try {
            // Process alerts only from the most recent real-time data that contains actual values
            // Extract the actual sensor reading from the real-time data structure
            let actualSensorData = realtimeDataForAlerts;
            if (realtimeDataForAlerts.reading) {
              actualSensorData = realtimeDataForAlerts.reading;
            }
            
            // Generate data signature to check for changes
            const currentDataSignature = generateDataSignature(actualSensorData);
            const hasDataChanged = currentDataSignature !== lastProcessedDataSignature.current;
            
            console.log('🚨 Debug: Processing alerts for sensor data:', {
              realtimeDataForAlerts,
              actualSensorData,
              hasRealtimeData: !!realtimeDataForAlerts,
              hasReading: !!realtimeDataForAlerts?.reading,
              currentDataSignature,
              lastProcessedSignature: lastProcessedDataSignature.current,
              hasDataChanged,
              realtimeDataStructure: realtimeDataForAlerts ? {
                pH: realtimeDataForAlerts.pH || realtimeDataForAlerts.reading?.pH,
                temperature: realtimeDataForAlerts.temperature || realtimeDataForAlerts.reading?.temperature,
                turbidity: realtimeDataForAlerts.turbidity || realtimeDataForAlerts.reading?.turbidity,
                salinity: realtimeDataForAlerts.salinity || realtimeDataForAlerts.reading?.salinity,
                timestamp: realtimeDataForAlerts.timestamp || realtimeDataForAlerts.reading?.timestamp
              } : null
            });
            
            // Only process alerts if data has actually changed
            if (hasDataChanged) {
              const sensorDataForAlerts = [{
                ...actualSensorData,
                datetime: actualSensorData.timestamp || realtimeDataForAlerts.timestamp,
              }];
              
              const alertResult = await getAlertFacade().processSensorData(sensorDataForAlerts);
              
              // Update the last processed signature
              lastProcessedDataSignature.current = currentDataSignature;

              if (alertResult.newAlerts.length > 0) {
                console.log(`🚨 ${alertResult.newAlerts.length} new alerts from real-time data refresh`);
              }

              if (alertResult.resolvedAlerts && alertResult.resolvedAlerts.length > 0) {
                console.log(`✅ ${alertResult.resolvedAlerts.length} alerts resolved`);
              }

              // Update state immediately and synchronously
              if (isMountedRef.current) {
                setAlerts(alertResult.processedAlerts);

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

                console.log(`✅ Alert state updated: ${alertResult.processedAlerts.length} alerts, saving to Firebase completed`);
              }
            } else {
              console.log('🚨 Skipping alert processing - data has not changed since last processing');
            }

          } catch (error) {
            console.error('❌ Error processing alerts from real-time data:', error);
          }
        } else {
          console.log('ℹ️ Skipping alert processing: no valid sensor data in real-time response');
          // Clear alerts if we have no valid data
          if (isMountedRef.current) {
            setAlerts([]);
            setAlertStats({ total: 0, high: 0, medium: 0, low: 0, recent: 0 });
            console.log('✅ Cleared alert state due to no valid sensor data');
          }
        }
      } else {
        console.log('ℹ️ No real-time data for alert processing');
        // Clear alerts if no real-time data is available
        setTimeout(() => {
          if (isMountedRef.current) {
            setAlerts([]);
            setAlertStats({ total: 0, high: 0, medium: 0, low: 0, recent: 0 });
          }
        }, 0);
      }

      // Sync alerts to Firebase immediately after processing
      // Note: Firebase sync is now handled automatically by AlertManagementFacade
      console.log('🔄 Alert sync is now handled automatically by the facade');

    } catch (error) {
      console.error(`❌ [${refreshId}] Error in optimized unified refresh:`, error);
      if (isMountedRef.current) {
        setError('Failed to refresh data');
      }
    } finally {
      // Always reset the refreshing flag
      isRefreshing.current = false;
      lastRefreshTime.current = Date.now();
      console.log(`✅ [${refreshId}] Refresh completed in ${Date.now() - refreshId}ms`);
    }
  }, []); // Empty dependency array to prevent function recreation

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
          // Only process alerts when we have valid, non-null data
          if (freshRealtimeData && freshRealtimeData.timestamp) {
            const hasValidData = (
              (freshRealtimeData.pH !== null && freshRealtimeData.pH !== undefined && !isNaN(freshRealtimeData.pH)) ||
              (freshRealtimeData.temperature !== null && freshRealtimeData.temperature !== undefined && !isNaN(freshRealtimeData.temperature)) ||
              (freshRealtimeData.turbidity !== null && freshRealtimeData.turbidity !== undefined && !isNaN(freshRealtimeData.turbidity)) ||
              (freshRealtimeData.salinity !== null && freshRealtimeData.salinity !== undefined && !isNaN(freshRealtimeData.salinity))
            );

            if (hasValidData) {
              const alertFacade = getAlertFacade();
              
              // Extract the actual sensor reading from the real-time data structure
              let actualSensorData = freshRealtimeData;
              if (freshRealtimeData.reading) {
                actualSensorData = freshRealtimeData.reading;
              }
              
              const realtimeAlerts = await alertFacade.processSensorData([{
                ...actualSensorData,
                datetime: actualSensorData.timestamp || freshRealtimeData.timestamp,
              }]);

              if (realtimeAlerts.newAlerts.length > 0) {
                console.log(`🚨 ${realtimeAlerts.newAlerts.length} new alerts from initial real-time data`);
                setAlerts(realtimeAlerts.processedAlerts);
              }
            } else {
              console.log('ℹ️ No valid real-time data for initial alert processing');
              // Clear alerts if preloaded alerts exist but no real data
              if (initialData?.alerts) {
                setAlerts([]);
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

    // Set up unified polling interval (every 5 minutes) - for historical data only
    const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
    console.log(`🔄 Setting up data refresh interval: ${POLLING_INTERVAL/1000}s`);

    intervalRef.current = setInterval(() => {
      console.log('🔄 Scheduled data refresh triggered');
      performUnifiedRefresh(true);
    }, POLLING_INTERVAL);

    // Set up real-time Firebase listener for immediate sensor data updates
    console.log('🔄 Setting up real-time Firebase listener for sensor data');
    realtimeUnsubscriberRef.current = realtimeDataService.subscribeToRealtimeData((newRealtimeData) => {
      if (isMountedRef.current && newRealtimeData) {
        console.log('🔄 Real-time data received from Firebase:', newRealtimeData);

        // Update realtimeData state immediately
        setRealtimeData(newRealtimeData);
        setLastUpdate(Date.now());

        // Check if we have valid sensor data for alert processing
        const hasValidData = (
          (newRealtimeData.pH !== null && newRealtimeData.pH !== undefined && !isNaN(newRealtimeData.pH)) ||
          (newRealtimeData.temperature !== null && newRealtimeData.temperature !== undefined && !isNaN(newRealtimeData.temperature)) ||
          (newRealtimeData.turbidity !== null && newRealtimeData.turbidity !== undefined && !isNaN(newRealtimeData.turbidity)) ||
          (newRealtimeData.salinity !== null && newRealtimeData.salinity !== undefined && !isNaN(newRealtimeData.salinity))
        );

        if (hasValidData) {
          // Extract actual sensor data
          let actualSensorData = newRealtimeData;

          // Generate data signature to check for changes
          const currentDataSignature = generateDataSignature(actualSensorData);
          const hasDataChanged = currentDataSignature !== lastProcessedDataSignature.current;

          if (hasDataChanged) {
            // Process alerts from new real-time data asynchronously
            (async () => {
              try {
                const sensorDataForAlerts = [{
                  ...actualSensorData,
                  datetime: actualSensorData.timestamp || newRealtimeData.timestamp,
                }];

                const alertResult = await getAlertFacade().processSensorData(sensorDataForAlerts);
                lastProcessedDataSignature.current = currentDataSignature;

                if (alertResult.newAlerts.length > 0) {
                  console.log(`🚨 ${alertResult.newAlerts.length} new alerts from real-time Firebase update`);
                }

                if (alertResult.resolvedAlerts && alertResult.resolvedAlerts.length > 0) {
                  console.log(`✅ ${alertResult.resolvedAlerts.length} alerts resolved`);
                }

                // Update alerts state asynchronously
                if (isMountedRef.current) {
                  setAlerts(alertResult.processedAlerts);

                  // Update alert statistics
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

                  console.log(`✅ Real-time Firebase update: Alert state updated with ${alertResult.processedAlerts.length} alerts`);
                }
              } catch (error) {
                console.error('❌ Error processing alerts from real-time data:', error);
              }
            })();
          } else {
            console.log('🚨 Skipping alert processing - data has not changed since last real-time update');
          }
        } else {
          console.log('ℹ️ Real-time data received but no valid sensor parameters - clearing alerts');
          if (isMountedRef.current) {
            setAlerts([]);
            setAlertStats({ total: 0, high: 0, medium: 0, low: 0, recent: 0 });
          }
        }
      }
    });

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      isRefreshing.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
      if (realtimeUnsubscriberRef.current) {
        console.log('🔌 Unsubscribing from real-time Firebase listener');
        realtimeUnsubscriberRef.current();
        realtimeUnsubscriberRef.current = null;
      }
    };
  }, [initialData]); // Only depend on initialData, not the functions

  /**
   * Manually triggers a refresh of all data sources with rate limiting
   * @param {boolean} [force=false] - When true, bypasses rate limiting
   * @returns {Promise<boolean>} True if refresh was initiated, false if rate limited
   */
  const refreshData = useCallback(async (force = false) => {
    const MIN_REFRESH_INTERVAL = 10000; // 10 seconds minimum between manual refreshes
    const now = Date.now();
    
    // Rate limiting check
    if (!force && (now - lastRefreshTime.current) < MIN_REFRESH_INTERVAL) {
      const timeLeft = Math.ceil((MIN_REFRESH_INTERVAL - (now - lastRefreshTime.current)) / 1000);
      console.warn(`⏳ Please wait ${timeLeft}s before refreshing again`);
      return false;
    }
    
    console.log('🔄 Manual refresh triggered');
    try {
      await performUnifiedRefresh(false); // Force fresh data on manual refresh
      return true;
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      return false;
    }
  }, [performUnifiedRefresh]);

  // Alert display helper functions
  
  /**
   * Gets a limited set of critical alerts for the homepage
   * Only returns alerts when real-time data is available and valid
   * @returns {Array} Alerts or empty array based on real-time data availability
   */
  const getHomepageAlerts = useCallback(async () => {
    // Check if we have valid real-time data first
    if (!realtimeData || !realtimeData.timestamp) {
      console.log('ℹ️ No real-time data available, returning normal state');
      return []; // Return empty to show "All Parameters Normal"
    }

    // Check if the real-time data has valid parameter values
    const hasValidData = (
      (realtimeData.pH !== null && realtimeData.pH !== undefined && !isNaN(realtimeData.pH)) ||
      (realtimeData.temperature !== null && realtimeData.temperature !== undefined && !isNaN(realtimeData.temperature)) ||
      (realtimeData.turbidity !== null && realtimeData.turbidity !== undefined && !isNaN(realtimeData.turbidity)) ||
      (realtimeData.salinity !== null && realtimeData.salinity !== undefined && !isNaN(realtimeData.salinity))
    );

    if (!hasValidData) {
      console.log('ℹ️ Real-time data present but no valid parameters, returning normal state');
      return []; // Return empty to show "All Parameters Normal"
    }

    // Only return alerts when we have valid real-time data
    // Get alerts from current alerts state instead of alertFacade to ensure consistency with real-time data
    const maxAlertsToShow = 3; // Show maximum 3 alerts on homepage
    return alerts
      .filter(alert =>
        alert && alert.parameter &&
        (alert.severity === 'high' || alert.severity === 'critical') // Only show high/critical alerts
      )
      .slice(0, maxAlertsToShow)
      .map(alert => ({
        ...alert,
        displayMessage: `${alert.parameter?.toUpperCase() || 'UNKNOWN'}: ${alert.value !== undefined && alert.value !== null ? Number(alert.value).toFixed(2) : 'N/A'}`,
      }));
  }, [realtimeData, alerts]); // Include alerts in dependencies

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
   * Test function to verify alert processing and storage
   * @returns {Promise<Object>} Test results
   */
  const testAlertProcessing = useCallback(async () => {
    console.log('🧪 Testing alert processing and storage...');

    try {
      const testData = [{
        pH: 9.5,
        temperature: 36,
        turbidity: 75,
        salinity: 2.5,
        datetime: new Date(),
        timestamp: new Date().toISOString()
      }];

      console.log('📊 Test data:', testData[0]);

      const alertResult = await getAlertFacade().processSensorData(testData);
      console.log('🚨 Test alert processing result:', {
        newAlerts: alertResult.newAlerts.length,
        processedAlerts: alertResult.processedAlerts.length,
        errors: alertResult.errors?.length || 0,
        hasNotifications: alertResult.notifications?.length > 0
      });

      // Verify alerts were saved by fetching them back
      const allAlerts = await getAlertFacade().getAlertsForDisplay({ limit: 50 });
      const recentTestAlerts = allAlerts.filter(alert =>
        alert.parameter === 'pH' && Math.abs(alert.value - 9.5) < 0.1
      );

      console.log('🔍 Verification: Found', recentTestAlerts.length, 'matching alerts in Firebase');

      return {
        success: true,
        alertsProcessed: alertResult.processedAlerts.length,
        alertsSaved: recentTestAlerts.length,
        hasErrors: (alertResult.errors?.length || 0) > 0,
        errorDetails: alertResult.errors
      };

    } catch (error) {
      console.error('❌ Test alert processing failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }, []);

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

    // Testing and debugging
    testAlertProcessing, // Test function for alert processing and storage

    // Legacy compatibility
    allAlerts: alerts,   // Alias for backward compatibility
  }), [
    // Dependencies array - context updates when any of these change
    alerts, sensorData, dailyReport, realtimeData, loading,
    error, lastUpdate, refreshData, alertStats,
    getHomepageAlerts, getNotificationAlerts, getAlertStatistics,
    getPerformanceMetrics, testAlertProcessing
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
