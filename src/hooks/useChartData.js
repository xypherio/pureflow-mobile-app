/**
 * useChartData Hook
 *
 * A comprehensive custom hook for managing chart data across the application.
 * Handles data fetching, caching, error recovery, and automatic refresh logic
 * for both home dashboard and reports sections.
 *
 * Features:
 * - Dual data sources (home tab: current day, reports: aggregated by time filter)
 * - Intelligent caching with expiration and automatic cleanup
 * - Retry logic with exponential backoff for failed requests
 * - Automatic refresh cycles for real-time data
 * - Request cancellation to prevent race conditions
 * - Error recovery with cached data fallback when available
 *
 * @param {string} type - Data type to fetch ('home' for dashboard, 'reports' for reports tab)
 * @param {string} timeFilter - Time period for reports ('daily', 'weekly', 'monthly')
 * @param {string} selectedParameter - Optional parameter filter (currently unused)
 * @returns {Object} Hook interface with data and state management functions
 * @property {Array} chartData - Processed data points for charts
 * @property {boolean} loading - Loading state indicator
 * @property {string|null} error - Error message if fetch failed
 * @property {Date|null} lastUpdated - Timestamp of last successful data fetch
 * @property {Function} refreshData - Manual refresh function
 * @property {boolean} hasData - Whether data array contains items
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { historicalDataService } from '../services/historicalDataService';

/**
 * STATE MANAGEMENT
 * Reducer for managing chart data state with predictable actions
 */
const chartDataReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START': // Initiates loading state and clears previous errors
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': // Successful data fetch with valid data
      return {
        ...state,
        loading: false,
        chartData: action.payload,
        lastUpdated: new Date(),
        error: null,
        hasData: action.payload.length > 0
      };
    case 'FETCH_SUCCESS_EMPTY': // Successful fetch but no data available
      return {
        ...state,
        loading: false,
        chartData: [],
        lastUpdated: new Date(),
        error: null,
        hasData: false
      };
    case 'FETCH_ERROR': // Failed to fetch data, keeps existing data if available
      return {
        ...state,
        loading: false,
        error: action.error,
        hasData: state.chartData.length > 0
      };
    case 'USE_CACHED_DATA': // Using cached data as fallback with error message
      return {
        ...state,
        loading: false,
        error: action.error,
        hasData: state.chartData.length > 0
      };
    default:
      return state;
  }
};

/**
 * MAIN HOOK EXPORTS
 */
export const useChartData = (type, timeFilter = 'daily', selectedParameter = null) => {
  // State management with reducer pattern for predictable updates
  const [state, dispatch] = useReducer(chartDataReducer, {
    chartData: [],
    loading: true,
    error: null,
    lastUpdated: null,
    hasData: false
  });

  // Extract state for cleaner code
  const { chartData, loading, error, lastUpdated, hasData } = state;

  // Refs for managing async operations and component lifecycle
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * COMPONENT LIFECYCLE MANAGEMENT
   * Cleanup function to abort pending requests when component unmounts
   * Prevents memory leaks and race conditions
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * DATA PROCESSING
   * Validates and normalizes chart data from the service layer
   * Ensures consistent data structure for chart rendering
   */
  const processChartData = useCallback((data, limit = 50) => {
    // Validate input is an array
    if (!Array.isArray(data)) {
      console.warn('⚠️ [useChartData] Invalid data format, expected array:', data);
      return [];
    }

    return data
      // Filter out invalid items and ensure required fields
      .filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ [useChartData] Invalid data item:', item);
          return false;
        }

        // Ensure datetime field exists
        if (!item.datetime) {
          console.warn('⚠️ [useChartData] Missing datetime in data item:', item);
          return false;
        }

        // Validate datetime can be parsed to valid Date
        const datetime = typeof item.datetime === 'string'
          ? new Date(item.datetime)
          : item.datetime;

        if (isNaN(datetime.getTime())) {
          console.warn('⚠️ [useChartData] Invalid datetime in data item:', item);
          return false;
        }

        return true;
      })
      // Normalize datetime to Date objects
      .map(item => ({
        ...item,
        datetime: typeof item.datetime === 'string'
          ? new Date(item.datetime)
          : item.datetime
      }))
      // Sort newest first for charts
      .sort((a, b) => b.datetime - a.datetime)
      // Limit items for performance
      .slice(0, limit);
  }, []);

  /**
   * HOME TAB DATA FETCHING
   * Fetches current day's data for the dashboard with caching and error recovery
   */
  const fetchHomeData = useCallback(async () => {
    // Prevent fetch if component unmounted
    if (!isMountedRef.current) return;

    console.log('🏠 Starting fetchHomeData...');

    // Cancel any existing request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set loading state
    dispatch({ type: 'FETCH_START' });

    try {
      console.log('⏳ Fetching current day data from historicalDataService...');

      // Create fetch promise with timeout for better UX
      const fetchPromise = historicalDataService.getCurrentDayData();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch timeout after 30 seconds')), 30000);
      });

      // Race between fetch and timeout
      const data = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if component still mounted after async operation
      if (!isMountedRef.current) return;

      // Process and validate received data
      const processedData = processChartData(Array.isArray(data) ? data : []);

      console.log('✅ Home data fetch completed successfully', {
        originalCount: Array.isArray(data) ? data.length : 0,
        processedCount: processedData.length
      });

      // Dispatch success with processed data
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: processedData
      });

    } catch (err) {
      // Handle aborted requests (user navigation/cancellation)
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        return;
      }

      // Prevent state updates if component unmounted
      if (!isMountedRef.current) return;

      console.error('❌ Error in fetchHomeData:', {
        error: err.message,
        stack: err.stack,
        type: typeof err
      });

      // ATTEMPT CACHED DATA FALLBACK
      try {
        console.log('🔄 Attempting to get cached data as fallback...');
        const cachedData = await historicalDataService.getCurrentDayData();

        if (Array.isArray(cachedData) && cachedData.length > 0) {
          const processedData = processChartData(cachedData);

          console.log('📦 Using cached data fallback:', {
            cachedCount: cachedData.length,
            processedCount: processedData.length
          });

          // Show cached data with informative message
          dispatch({
            type: 'USE_CACHED_DATA',
            payload: processedData,
            error: 'Using cached data due to: ' + (err.message || 'Unknown error')
          });
          return;
        }
      } catch (cacheErr) {
        console.error('❌ Cache fallback failed:', cacheErr);
      }

      // FINAL FALLBACK: Show user-friendly error message
      const errorMessage = err.message.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Failed to load home data. Please try again.';

      dispatch({
        type: 'FETCH_ERROR',
        error: errorMessage
      });
    } finally {
      // Clean up abort controller reference if this is the current request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []); // Empty dependency array to prevent unnecessary recreations

  /**
   * UTILITY FUNCTIONS
   * Helper function to validate if a date is within the specified range
   * Used for filtering report data based on date ranges
   */
  const isDateInRange = (date, rangeStart, rangeEnd) => {
    if (!date) return false;

    const dateTime = date instanceof Date ? date : new Date(date);
    const rangeStartTime = rangeStart instanceof Date ? rangeStart : new Date(rangeStart);
    const rangeEndTime = rangeEnd instanceof Date ? rangeEnd : new Date(rangeEnd);

    // Handle invalid dates gracefully
    if (isNaN(dateTime.getTime())) {
      console.warn('Invalid date in isDateInRange:', date);
      return false;
    }

    return dateTime >= rangeStartTime && dateTime <= rangeEndTime;
  };

  /**
   * REPORTS DATA FETCHING
   * Fetches aggregated data for reports with retry logic, caching, and no fallback to empty state
   * Reports don't use home data fallback because they show data for specific time periods
   */
  const fetchReportsData = useCallback(async (filter) => {
    console.log('📅 [useChartData] Fetching reports data with filter:', filter, 'type:', type);

    // Log current state for debugging
    console.log('📊 [useChartData] Current state:', {
      loading,
      error,
      hasData,
      lastUpdated,
      chartData: chartData ? `Array(${chartData.length})` : 'null',
    });

    // Cancel any existing request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set loading state
    dispatch({ type: 'FETCH_START' });

    try {
      // PARAMETER VALIDATION
      if (!filter || typeof filter !== 'string') {
        throw new Error('Invalid filter parameter provided');
      }

      // DATE RANGE CALCULATION
      let startDate, endDate;
      try {
        const dateRange = historicalDataService.getDateRange(filter);
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);

        // Validate date range is valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date range generated');
        }

        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }
      } catch (dateError) {
        console.error('❌ [useChartData] Date range error:', dateError);
        throw new Error(`Failed to generate date range for filter ${filter}: ${dateError.message}`);
      }

      const adjustedStartDate = new Date(startDate);
      const adjustedEndDate = new Date(endDate);

      console.log('📅 [useChartData] Date range:', {
        filter,
        startDate: adjustedStartDate.toISOString(),
        localStartDate: adjustedStartDate.toString(),
        endDate: adjustedEndDate.toISOString(),
        localEndDate: adjustedEndDate.toString()
      });

      // CACHE MANAGEMENT
      try {
        // Clear old cache for this filter to ensure fresh data
        historicalDataService.clearCacheForFilter(filter);
      } catch (cacheError) {
        console.warn('⚠️ [useChartData] Failed to clear cache:', cacheError);
        // Continue anyway - cache clearing is not critical
      }

      // RETRY LOGIC WITH EXPONENTIAL BACKOFF
      let data = [];
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && data.length === 0) {
        attempts++;
        console.log(`🔄 [useChartData] Fetch attempt ${attempts}/${maxAttempts}`);

        try {
          // Disable cache on retries for fresh data
          const useCache = attempts === 1;
          if (!useCache) {
            console.log('🔄 [useChartData] Cache disabled for retry attempt');
          }

          console.log('🔄 [useChartData] Fetching aggregated data...', {
            filter,
            startDate: adjustedStartDate.toISOString(),
            endDate: adjustedEndDate.toISOString(),
            useCache,
            attempt: attempts,
            maxAttempts
          });

          // Create fetch promise with timeout
          const fetchPromise = historicalDataService.getAggregatedData(
            filter,
            adjustedStartDate,
            adjustedEndDate,
            useCache
          );

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Fetch timeout after 30 seconds')), 30000);
          });

          const result = await Promise.race([fetchPromise, timeoutPromise]);

          console.log('✅ [useChartData] Received data from historicalDataService:', {
            resultType: Array.isArray(result) ? 'array' : typeof result,
            resultLength: Array.isArray(result) ? result.length : 'N/A',
            firstItem: Array.isArray(result) && result.length > 0 ? result[0] : 'N/A',
            lastItem: Array.isArray(result) && result.length > 0 ? result[result.length - 1] : 'N/A'
          });

          console.log(`📊 [useChartData] Received ${result?.length || 0} data points on attempt ${attempts}`);

          // PROCESS DATA IF RECEIVED
          if (result && Array.isArray(result) && result.length > 0) {
            console.log('🔍 [useChartData] Processing raw data items:', {
              count: result.length,
              firstItem: result[0],
              lastItem: result[result.length - 1]
            });

            // Transform and validate data
            data = result
              .map(item => {
                const processedItem = { ...item };

                // Ensure datetime is valid Date object
                try {
                  if (typeof processedItem.datetime === 'string' || processedItem.datetime instanceof Date) {
                    processedItem.datetime = new Date(processedItem.datetime);

                    if (isNaN(processedItem.datetime.getTime())) {
                      console.warn('⚠️ [useChartData] Invalid date in data point:', processedItem);
                      return null;
                    }
                  } else {
                    console.warn('⚠️ [useChartData] Missing or invalid datetime:', processedItem);
                    return null;
                  }
                } catch (error) {
                  console.warn('⚠️ [useChartData] Error processing datetime:', error, processedItem);
                  return null;
                }

                // Validate at least one water quality parameter exists
                const hasValidParameter = ['pH', 'temperature', 'salinity', 'turbidity'].some(
                  param => processedItem[param] !== undefined && processedItem[param] !== null
                );

                if (!hasValidParameter) {
                  console.warn('⚠️ [useChartData] No valid parameters in data point:', processedItem);
                  return null;
                }

                // Validate pH range and ensure numeric types
                if (processedItem.pH !== undefined) {
                  if (processedItem.pH < 0 || processedItem.pH > 14) {
                    console.warn('⚠️ [useChartData] Extreme pH value detected (should be 0-14):', processedItem.pH);
                  }
                  processedItem.pH = Number(processedItem.pH);
                }

                // Ensure other parameters are numeric
                ['temperature', 'salinity', 'turbidity'].forEach(param => {
                  if (processedItem[param] !== undefined) {
                    processedItem[param] = Number(processedItem[param]);
                  }
                });

                return processedItem;
              })
              .filter(Boolean) // Remove null entries
              .filter(item => {
                // Filter by date range to ensure data is within requested period
                try {
                  return isDateInRange(item.datetime, adjustedStartDate, adjustedEndDate);
                } catch (rangeError) {
                  console.warn('⚠️ [useChartData] Error checking date range:', rangeError);
                  return false;
                }
              });

            // Sort chronologically for proper chart display
            data.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

            console.log(`📊 [useChartData] Processed data:`, {
              count: data.length,
              first: data[0]?.datetime?.toISOString(),
              last: data[data.length - 1]?.datetime?.toISOString(),
              sample: data[0],
              parameters: data[0] ? Object.keys(data[0]).filter(k => k !== 'datetime') : 'no data'
            });

            // If we got data, exit retry loop
            if (data.length > 0) {
              break;
            }
          }

        } catch (error) {
          console.error(`❌ [useChartData] Attempt ${attempts} failed:`, {
            error: error.message,
            stack: error.stack,
            filter,
            attempt: attempts,
            maxAttempts
          });

          // Exit retry loop if max attempts reached
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to fetch data after ${maxAttempts} attempts: ${error.message}`);
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempts - 1) * 1000;
          console.log(`⏳ [useChartData] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // HANDLE EMPTY DATA GRACEFULLY
      if (data.length === 0) {
        console.log('ℹ️ [useChartData] No data available for the current time period - showing empty state');
        dispatch({ type: 'FETCH_SUCCESS_EMPTY' });
        return;
      }

      // FINAL VALIDATION
      if (!Array.isArray(data)) {
        throw new Error('Final data is not an array');
      }

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: data // Data is already processed above
      });

      console.log('✅ [useChartData] Data fetch completed successfully:', {
        filter,
        dataCount: data.length,
        processedCount: data.length,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      // Handle aborted requests
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        return;
      }

      if (!isMountedRef.current) return;

      console.error('❌ Error in fetchReportsData:', {
        error: err.message,
        stack: err.stack,
        filter,
        type: typeof err
      });

      // Convert technical errors to user-friendly messages
      const errorMessage = err.message.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Failed to load data. Please try again.';

      // ATTEMPT CACHED DATA AS LAST RESORT
      try {
        console.log('🔄 [useChartData] Attempting to get cached data as last resort...');
        const { startDate, endDate } = historicalDataService.getDateRange(filter);
        const cachedData = await historicalDataService.getAggregatedData(filter, startDate, endDate, true);

        console.log('📦 [useChartData] Cached data retrieved:', {
          cachedCount: Array.isArray(cachedData) ? cachedData.length : 0,
          firstCachedItem: Array.isArray(cachedData) ? cachedData[0] : 'Not an array'
        });

        if (Array.isArray(cachedData) && cachedData.length > 0) {
          dispatch({
            type: 'USE_CACHED_DATA',
            payload: cachedData,
            error: `${errorMessage} (Showing cached data)`
          });
          console.log('✅ [useChartData] Using cached data as fallback');
        } else {
          console.log('⚠️ [useChartData] No cached data available for filter:', filter);
          dispatch({
            type: 'FETCH_ERROR',
            error: errorMessage
          });
        }
      } catch (cacheErr) {
        console.error('❌ [useChartData] Cache fallback failed:', {
          error: cacheErr.message,
          stack: cacheErr.stack
        });
        dispatch({
          type: 'FETCH_ERROR',
          error: errorMessage
        });
      }
    } finally {
      // Clean up abort controller
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      console.log('🏁 [useChartData] fetchReportsData completed for filter:', filter);
    }
  }, []);

  /**
   * REFRESH MANAGEMENT
   * Debounced refresh function to prevent spam requests
   */
  const debouncedRefresh = useMemo(
    () => debounce((refreshFn) => {
      if (isMountedRef.current) {
        refreshFn();
      }
    }, 1000), // 1 second debounce
    []
  );

  /**
   * PUBLIC API
   * Manual refresh function exposed to components
   */
  const refreshData = useCallback(() => {
    console.log('🔄 [useChartData] Manual refresh triggered');

    if (!isMountedRef.current) return;

    // Route refresh based on current type and filter
    if (type === 'home') {
      debouncedRefresh(fetchHomeData);
    } else if (type === 'reports' && timeFilter) {
      console.log('Refreshing reports data...');
      debouncedRefresh(() => fetchReportsData(timeFilter));
    } else {
      console.error('❌ [useChartData] Invalid refresh parameters:', { type, timeFilter });
      dispatch({
        type: 'FETCH_ERROR',
        error: 'Invalid refresh parameters. Please try again.'
      });
    }
  }, [type, timeFilter, debouncedRefresh, fetchHomeData, fetchReportsData]);

  /**
   * AUTOMATIC REFRESH CYCLING
   * Home tab auto-refresh every 30 seconds for real-time dashboard
   */
  useEffect(() => {
    // Only apply to home tab
    if (type !== 'home') return;

    // Initial data fetch
    fetchHomeData();

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 Auto-refreshing home data...');
        debouncedRefresh(fetchHomeData);
      }
    }, 30 * 1000); // 30 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
      console.log('🧹 [useChartData] Home auto-refresh interval cleared');
    };
  }, [type, fetchHomeData, debouncedRefresh]);

  /**
   * REPORTS INITIALIZATION
   * Fetch reports data when filter or type changes
   */
  useEffect(() => {
    if (type === 'reports' && timeFilter) {
      fetchReportsData(timeFilter);
    }
  }, [type, timeFilter, fetchReportsData]);

  /**
   * CACHE MAINTENANCE
   * Automatically clear expired cache entries hourly
   */
  useEffect(() => {
    const cacheCleanupInterval = setInterval(() => {
      try {
        historicalDataService.clearExpiredCache();
      } catch (error) {
        console.warn('⚠️ [useChartData] Cache cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      clearInterval(cacheCleanupInterval);
      console.log('🧹 [useChartData] Cache cleanup interval cleared');
    };
  }, []);

  /**
   * OPTIMIZED RETURNS
   * Memoize return object to prevent unnecessary re-renders
   */
  return useMemo(() => ({
    chartData,
    loading,
    error,
    lastUpdated,
    refreshData,
    hasData: chartData.length > 0
  }), [chartData, loading, error, lastUpdated, refreshData]);
};
