import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { historicalDataService } from '../services/historicalDataService';

// Reducer for managing chart data state
const chartDataReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        chartData: action.payload,
        lastUpdated: new Date(),
        error: null,
        hasData: action.payload.length > 0
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
        hasData: state.chartData.length > 0
      };
    case 'USE_CACHED_DATA':
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

export const useChartData = (type, timeFilter = 'daily', selectedParameter = null) => {
  const [state, dispatch] = useReducer(chartDataReducer, {
    chartData: [],
    loading: true,
    error: null,
    lastUpdated: null,
    hasData: false
  });

  const { chartData, loading, error, lastUpdated, hasData } = state;
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Process and validate data from the service
  const processChartData = useCallback((data, limit = 50) => {
    if (!Array.isArray(data)) {
      console.warn('⚠️ [useChartData] Invalid data format, expected array:', data);
      return [];
    }

    return data
      .filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ [useChartData] Invalid data item:', item);
          return false;
        }

        if (!item.datetime) {
          console.warn('⚠️ [useChartData] Missing datetime in data item:', item);
          return false;
        }

        // Check if datetime is valid
        const datetime = typeof item.datetime === 'string'
          ? new Date(item.datetime)
          : item.datetime;

        if (isNaN(datetime.getTime())) {
          console.warn('⚠️ [useChartData] Invalid datetime in data item:', item);
          return false;
        }

        return true;
      })
      .map(item => ({
        ...item,
        datetime: typeof item.datetime === 'string' 
          ? new Date(item.datetime) 
          : item.datetime
      }))
      .sort((a, b) => b.datetime - a.datetime) // Newest first
      .slice(0, limit); // Limit number of items
  }, []);

  // Fetch data for home tab (current day, all readings) - stable reference
  const fetchHomeData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🏠 Starting fetchHomeData...');
    
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    dispatch({ type: 'FETCH_START' });

    try {
      console.log('⏳ Fetching current day data from historicalDataService...');
      
      const fetchPromise = historicalDataService.getCurrentDayData();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch timeout after 30 seconds')), 30000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Check if component is still mounted
      if (!isMountedRef.current) return;

      // Process and validate the data
      const processedData = processChartData(Array.isArray(data) ? data : []);
      
      console.log('✅ Home data fetch completed successfully', {
        originalCount: Array.isArray(data) ? data.length : 0,
        processedCount: processedData.length
      });
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        payload: processedData 
      });

    } catch (err) {
      // Ignore aborted requests
      if (err.name === 'AbortError') {
        console.log('⏹️ Fetch aborted');
        return;
      }
      
      if (!isMountedRef.current) return;
      
      console.error('❌ Error in fetchHomeData:', {
        error: err.message,
        stack: err.stack,
        type: typeof err
      });

      // Try to use cached data as fallback
      try {
        console.log('🔄 Attempting to get cached data as fallback...');
        const cachedData = await historicalDataService.getCurrentDayData();
        
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          const processedData = processChartData(cachedData);
          
          console.log('📦 Using cached data fallback:', {
            cachedCount: cachedData.length,
            processedCount: processedData.length
          });
          
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
      
      // If we get here, we couldn't use cached data
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
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []); // Remove processChartData dependency to prevent function recreation

  // Helper function to validate if a date is within the specified range
  const isDateInRange = (date, rangeStart, rangeEnd) => {
    if (!date) return false;
    
    const dateTime = date instanceof Date ? date : new Date(date);
    const rangeStartTime = rangeStart instanceof Date ? rangeStart : new Date(rangeStart);
    const rangeEndTime = rangeEnd instanceof Date ? rangeEnd : new Date(rangeEnd);
    
    // Handle invalid dates
    if (isNaN(dateTime.getTime())) {
      console.warn('Invalid date in isDateInRange:', date);
      return false;
    }
    
    return dateTime >= rangeStartTime && dateTime <= rangeEndTime;
  };

  // Fetch data for reports tab (aggregated based on time filter)
  const fetchReportsData = useCallback(async (filter) => {
    console.log('📅 [useChartData] Fetching reports data with filter:', filter);

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    dispatch({ type: 'FETCH_START' });

    try {

      // Validate input parameters
      if (!filter || typeof filter !== 'string') {
        throw new Error('Invalid filter parameter provided');
      }

      // Get date range with timezone handling and validation
      let startDate, endDate;
      try {
        const dateRange = historicalDataService.getDateRange(filter);
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);

        // Validate dates
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

      // Create local date copies with validation
      const adjustedStartDate = new Date(startDate);
      const adjustedEndDate = new Date(endDate);

      console.log('📅 [useChartData] Date range:', {
        filter,
        startDate: adjustedStartDate.toISOString(),
        localStartDate: adjustedStartDate.toString(),
        endDate: adjustedEndDate.toISOString(),
        localEndDate: adjustedEndDate.toString()
      });

      // Clear cache for this filter to ensure fresh data
      try {
        historicalDataService.clearCacheForFilter(filter);
      } catch (cacheError) {
        console.warn('⚠️ [useChartData] Failed to clear cache:', cacheError);
        // Continue anyway - cache clearing is not critical
      }

      // Try to fetch data with enhanced retry logic
      let data = [];
      let attempts = 0;
      const maxAttempts = 3; // Increased retry attempts

      while (attempts < maxAttempts && data.length === 0) {
        attempts++;
        console.log(`🔄 [useChartData] Fetch attempt ${attempts}/${maxAttempts}`);

        try {
          // Progressive backoff: disable cache on later attempts
          const useCache = attempts === 1;
          if (!useCache) {
            console.log('🔄 [useChartData] Cache disabled for retry attempt');
          }

          // Fetch data with current settings and timeout
          const fetchPromise = historicalDataService.getAggregatedData(
            filter,
            adjustedStartDate,
            adjustedEndDate,
            useCache
          );

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Fetch timeout after 30 seconds')), 30000);
          });

          const result = await Promise.race([fetchPromise, timeoutPromise]);

          console.log(`📊 [useChartData] Received ${result?.length || 0} data points on attempt ${attempts}`);

          if (result && Array.isArray(result) && result.length > 0) {
            // Process and validate the data
            data = result
              .filter(item => {
                // Validate each data item
                if (!item || typeof item !== 'object') {
                  console.warn('⚠️ [useChartData] Invalid data item:', item);
                  return false;
                }

                if (!item.datetime) {
                  console.warn('⚠️ [useChartData] Missing datetime in data item:', item);
                  return false;
                }

                return true;
              })
              .map(item => {
                try {
                  const datetime = typeof item.datetime === 'string'
                    ? new Date(item.datetime)
                    : item.datetime;

                  // Skip invalid dates
                  if (isNaN(datetime.getTime())) {
                    console.warn('⚠️ [useChartData] Invalid date in data point:', item);
                    return null;
                  }

                  return { ...item, datetime };
                } catch (parseError) {
                  console.warn('⚠️ [useChartData] Error parsing data item:', item, parseError);
                  return null;
                }
              })
              .filter(Boolean) // Remove null entries
              .filter(item => {
                // Filter by date range
                try {
                  return isDateInRange(item.datetime, adjustedStartDate, adjustedEndDate);
                } catch (rangeError) {
                  console.warn('⚠️ [useChartData] Error checking date range:', rangeError);
                  return false;
                }
              });

            // Sort by datetime
            data.sort((a, b) => a.datetime - b.datetime);

            console.log('📊 [useChartData] Processed data:', {
              count: data.length,
              first: data[0]?.datetime?.toISOString(),
              last: data[data.length - 1]?.datetime?.toISOString(),
              sample: data[0] || 'No data'
            });

            // If we got data, break out of retry loop
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

          if (attempts >= maxAttempts) {
            throw new Error(`Failed to fetch data after ${maxAttempts} attempts: ${error.message}`);
          }

          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempts - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ [useChartData] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Enhanced fallback to current day data if no data found
      if (data.length === 0) {
        console.warn('⚠️ [useChartData] No data found after all attempts, trying fallback to current day data');
        try {
          const todayData = await historicalDataService.getCurrentDayData();
          if (Array.isArray(todayData) && todayData.length > 0) {
            console.log('🔄 [useChartData] Using current day data as fallback:', {
              originalCount: todayData.length,
              filteredCount: todayData.length
            });
            data = todayData;
          } else {
            throw new Error('No fallback data available');
          }
        } catch (fallbackError) {
          console.error('❌ [useChartData] Fallback data fetch failed:', {
            error: fallbackError.message,
            stack: fallbackError.stack
          });
          throw new Error(`All data fetch attempts failed: ${fallbackError.message}`);
        }
      }

      // Validate final data before setting
      if (!Array.isArray(data)) {
        throw new Error('Final data is not an array');
      }

      // Process and validate the data
      const processedData = processChartData(data, null);
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        payload: processedData 
      });

      console.log('✅ [useChartData] Data fetch completed successfully:', {
        filter,
        dataCount: data.length,
        processedCount: processedData.length,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      // Ignore aborted requests
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

      // Set user-friendly error message
      const errorMessage = err.message.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Failed to load data. Please try again.';

      // Try to get cached data as last resort
      try {
        console.log('🔄 [useChartData] Attempting to get cached data as last resort...');
        const { startDate, endDate } = historicalDataService.getDateRange(filter);
        const cachedData = await historicalDataService.getAggregatedData(filter, startDate, endDate, true);

        console.log('📦 [useChartData] Cached data retrieved:', {
          cachedCount: Array.isArray(cachedData) ? cachedData.length : 0,
          firstCachedItem: Array.isArray(cachedData) ? cachedData[0] : 'Not an array'
        });

        if (Array.isArray(cachedData) && cachedData.length > 0) {
          const processedCachedData = processChartData(cachedData, null);
          
          dispatch({ 
            type: 'USE_CACHED_DATA', 
            payload: processedCachedData,
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
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      console.log('🏁 [useChartData] fetchReportsData completed for filter:', filter);
    }
  }, []); // Empty dependency array to prevent function recreation
  // Stable debounced refresh function - created once and reused
  const debouncedRefresh = useMemo(
    () => debounce((refreshFn) => {
      if (isMountedRef.current) {
        refreshFn();
      }
    }, 1000), // 1 second debounce
    [] // Empty dependency array - created once
  );
  
  // Optimized refresh function
  const refreshData = useCallback(() => {
    console.log('🔄 [useChartData] Manual refresh triggered');
    
    if (!isMountedRef.current) return;
    
    if (type === 'home') {
      debouncedRefresh(fetchHomeData);
    } else if (type === 'reports' && timeFilter) {
      console.log('Refreshing reports data...');
      // Use debounced refresh for reports as well
      debouncedRefresh(() => fetchReportsData(timeFilter));
    } else {
      console.error('❌ [useChartData] Invalid refresh parameters:', { type, timeFilter });
      dispatch({ 
        type: 'FETCH_ERROR', 
        error: 'Invalid refresh parameters. Please try again.' 
      });
    }
  }, [type, timeFilter]); // Only depend on primitive values

  // Auto-refresh for home tab every 30 seconds - stable dependencies
  useEffect(() => {
    if (type !== 'home') return;
    
    // Initial fetch
    fetchHomeData();
    
    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 Auto-refreshing home data...');
        debouncedRefresh(fetchHomeData);
      }
    }, 30 * 1000); // 30 seconds
    
    // Cleanup
    return () => {
      clearInterval(interval);
      console.log('🧹 [useChartData] Home auto-refresh interval cleared');
    };
  }, [type]); // Only depend on type, not the functions

  // Fetch reports data when time filter changes
  useEffect(() => {
    if (type === 'reports' && timeFilter) {
      fetchReportsData(timeFilter);
    }
  }, [type, timeFilter]); // Only depend on primitive values

  // Clear expired cache entries periodically
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

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    chartData,
    loading,
    error,
    lastUpdated,
    refreshData,
    hasData: chartData.length > 0
  }), [chartData, loading, error, lastUpdated, refreshData]);
}; 