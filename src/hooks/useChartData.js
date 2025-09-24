import { useCallback, useEffect, useState } from 'react';
import { historicalDataService } from '../services/historicalDataService';

export const useChartData = (type, timeFilter = 'daily', selectedParameter = null) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  console.log('🎯 useChartData hook called:', {
    type,
    timeFilter,
    selectedParameter,
    currentState: { chartDataLength: chartData.length, loading, error: !!error }
  });

  // Fetch data for home tab (current day, all readings)
  const fetchHomeData = useCallback(async () => {
    console.log('🏠 Starting fetchHomeData...');

    try {
      setLoading(true);
      setError(null);

      console.log('⏳ Fetching current day data from historicalDataService...');

      // Add timeout to prevent hanging
      const fetchPromise = historicalDataService.getCurrentDayData();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch timeout after 30 seconds')), 30000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      // Validate the response
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      console.log('📊 Data received from historicalDataService:', {
        dataLength: data.length,
        sampleData: data.slice(0, 2).map(d => ({
          datetime: d.datetime,
          pH: d.pH,
          temperature: d.temperature,
          turbidity: d.turbidity,
          salinity: d.salinity
        }))
      });

      // Filter data to show only recent readings that fit in chart
      // We'll limit to last 50 readings to avoid clutter
      const recentData = data
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
        .map(item => {
          // Normalize datetime to Date object
          const datetime = typeof item.datetime === 'string'
            ? new Date(item.datetime)
            : item.datetime;

          return { ...item, datetime };
        })
        .sort((a, b) => b.datetime - a.datetime) // Sort by newest first
        .slice(0, 50); // Take only the most recent 50 readings

      console.log('✂️ Filtered to recent 50 readings:', {
        originalCount: data.length,
        filteredCount: recentData.length
      });

      // Validate final data
      if (!Array.isArray(recentData)) {
        throw new Error('Filtered data is not an array');
      }

      setChartData(recentData);
      setLastUpdated(new Date());
      setError(null);

      console.log('✅ Home data fetch completed successfully');

    } catch (err) {
      console.error('❌ Error in fetchHomeData:', {
        error: err.message,
        stack: err.stack,
        type: typeof err
      });

      // Set user-friendly error message
      const errorMessage = err.message.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
        ? 'Network error. Please check your connection.'
        : 'Failed to load home data. Please try again.';

      setError(errorMessage);

      // Try to get cached data as fallback
      try {
        console.log('🔄 Attempting to get cached data as fallback...');
        const cachedData = await historicalDataService.getCurrentDayData();

        if (Array.isArray(cachedData) && cachedData.length > 0) {
          const recentData = cachedData
            .filter(item => item && item.datetime)
            .map(item => ({
              ...item,
              datetime: typeof item.datetime === 'string' ? new Date(item.datetime) : item.datetime
            }))
            .sort((a, b) => b.datetime - a.datetime)
            .slice(0, 50);

          console.log('📦 Using cached data fallback:', {
            cachedCount: cachedData.length,
            recentCount: recentData.length
          });

          setChartData(recentData);
          setLastUpdated(new Date());
          setError(`${errorMessage} (Showing cached data)`);
        } else {
          console.log('⚠️ No cached data available');
          setChartData([]);
        }
      } catch (cacheErr) {
        console.error('❌ Cache fallback failed:', {
          error: cacheErr.message,
          stack: cacheErr.stack
        });
        setChartData([]);
      }
    } finally {
      setLoading(false);
      console.log('🏁 fetchHomeData completed, loading set to false');
    }
  }, []);

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

    try {
      setLoading(true);
      setChartData([]);
      setError(null);

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

      setChartData(data);
      setLastUpdated(new Date());
      setError(null);

      console.log('✅ [useChartData] Data fetch completed successfully:', {
        filter,
        dataCount: data.length,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
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

      setError(errorMessage);

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
          setChartData(cachedData);
          setLastUpdated(new Date());
          setError(`${errorMessage} (Showing cached data)`);
          console.log('✅ [useChartData] Using cached data as fallback');
        } else {
          console.log('⚠️ [useChartData] No cached data available for filter:', filter);
          setChartData([]);
        }
      } catch (cacheErr) {
        console.error('❌ [useChartData] Cache fallback failed:', {
          error: cacheErr.message,
          stack: cacheErr.stack
        });
        setChartData([]);
      }
    } finally {
      setLoading(false);
      console.log('🏁 [useChartData] fetchReportsData completed for filter:', filter);
    }
  }, [timeFilter]); // Add timeFilter to dependency array

  // Refresh data
  const refreshData = useCallback(() => {
    console.log('🔄 [useChartData] Manual refresh triggered');

    try {
      if (type === 'home') {
        fetchHomeData();
      } else if (type === 'reports') {
        if (timeFilter && typeof timeFilter === 'string') {
          fetchReportsData(timeFilter);
        } else {
          console.error('❌ [useChartData] Invalid timeFilter for reports:', timeFilter);
          setError('Invalid time filter. Please select a valid time period.');
        }
      } else {
        console.error('❌ [useChartData] Unknown data type:', type);
        setError('Unknown data type. Please try again.');
      }
    } catch (error) {
      console.error('❌ [useChartData] Error in refreshData:', {
        error: error.message,
        stack: error.stack,
        type,
        timeFilter
      });
      setError('Failed to refresh data. Please try again.');
    }
  }, [type, timeFilter, fetchHomeData, fetchReportsData]);

  // Auto-refresh for home tab every 30 seconds
  useEffect(() => {
    if (type === 'home') {
      fetchHomeData();

      const interval = setInterval(() => {
        fetchHomeData();
      }, 30 * 1000); // 30 seconds

      return () => {
        clearInterval(interval);
        console.log('🧹 [useChartData] Home auto-refresh interval cleared');
      };
    }
  }, [type, fetchHomeData]);

  // Fetch reports data when time filter changes
  useEffect(() => {
    if (type === 'reports' && timeFilter) {
      fetchReportsData(timeFilter);
    }
  }, [type, timeFilter, fetchReportsData]);

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

  return {
    chartData,
    loading,
    error,
    lastUpdated,
    refreshData,
    hasData: chartData.length > 0
  };
}; 