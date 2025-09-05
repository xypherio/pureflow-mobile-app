import { useCallback, useEffect, useState, useRef } from 'react';
import { historicalDataService } from '../services/historicalDataService';

/**
 * Custom hook for optimized chart data fetching with pagination and caching
 * @param {string} type - The type of data to fetch ('home' or 'reports')
 * @param {string} timeFilter - Time filter for the data (e.g., 'daily', 'weekly', 'monthly')
 * @param {Object} options - Additional options
 * @param {number} options.limit - Number of items to fetch per page
 * @param {number} options.offset - Offset for pagination
 * @param {boolean} options.lazy - If true, won't fetch data on initial render
 * @param {boolean} options.forceRefresh - If true, bypass cache and force refresh
 * @returns {Object} - Chart data and state
 */
export const useOptimizedChartData = (type, timeFilter = 'daily', options = {}) => {
  const {
    limit = 50,
    offset = 0,
    lazy = false,
    forceRefresh = false
  } = options;

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dataFetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchData = useCallback(async (fetchOptions = {}) => {
    const {
      isRefresh = false,
      isLoadMore = false,
      currentLimit = limit,
      currentOffset = offset
    } = fetchOptions;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for the current request
    abortControllerRef.current = new AbortController();

    // Skip if we're already loading and not forcing a refresh
    if ((loading || isRefreshing) && !isRefresh && !isLoadMore && !forceRefresh) {
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!isLoadMore) {
        setLoading(true);
      }

      setError(null);

      let result = [];
      
      try {
        if (type === 'home') {
          // For home tab, get current day data with pagination
          const data = await Promise.race([
            historicalDataService.getCurrentDayData({
              limit: currentLimit,
              offset: currentOffset,
              forceRefresh: isRefresh || forceRefresh
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 10000) // 10s timeout
            )
          ]);
          
          // Reverse to show newest first for home tab
          result = Array.isArray(data) ? [...data].reverse() : [];
        } else {
          // For reports tab, get aggregated data
          const { startDate, endDate } = historicalDataService.getDateRange(timeFilter);
          
          const data = await Promise.race([
            historicalDataService.getAggregatedData(
              timeFilter,
              startDate,
              endDate,
              {
                limit: currentLimit,
                offset: currentOffset,
                forceRefresh: isRefresh || forceRefresh
              }
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 15000) // 15s timeout
            )
          ]);
          
          // Sort by date for reports
          result = Array.isArray(data) 
            ? [...data].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            : [];
        }
        
        // Update hasMore based on the number of results
        setHasMore(result.length >= currentLimit);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Request was aborted');
          return; // Don't update state if request was aborted
        }
        
        console.error('Error fetching chart data:', err);
        throw err; // Re-throw to be caught by the outer try-catch
      }

      // Update state based on whether we're appending or replacing data
      setChartData(prevData => {
        // If we're loading more, append to existing data, otherwise replace it
        const newData = isLoadMore ? [...prevData, ...result] : result;
        
        // Deduplicate by ID and datetime to prevent duplicates
        const uniqueData = Array.from(new Map(
          newData.map(item => [
            `${item.id || ''}-${item.datetime?.getTime() || ''}`, 
            item
          ])
        ).values());
        
        return uniqueData;
      });

      setLastUpdated(new Date());
      dataFetchedRef.current = true;
      
      // Log performance metrics
      if (__DEV__) {
        console.log(`📊 ${type === 'home' ? 'Home' : 'Report'} data updated:`, {
          totalItems: chartData.length + result.length,
          newItems: result.length,
          isLoadMore,
          isRefresh,
          time: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      
      // Only update error state if we don't have any data yet
      if (chartData.length === 0) {
        setError(err.message || 'Failed to fetch data');
      } else {
        // If we have some data, just log the error but don't show it to the user
        console.log('Non-critical error after initial load:', err.message);
      }
      
      // Try to use cached data if available and we don't have any data
      if (chartData.length === 0) {
        try {
          const cachedData = type === 'home' 
            ? await historicalDataService.getCurrentDayData({ useCache: true })
            : await historicalDataService.getCachedData(timeFilter);
            
          if (cachedData?.length > 0) {
            console.log('Using cached data as fallback');
            setChartData(cachedData);
            setHasMore(false);
            setError(null); // Clear error if we successfully got cached data
          }
        } catch (cacheErr) {
          console.error('Cache fallback failed:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [type, timeFilter, limit, offset, forceRefresh, loading, isRefreshing]);

  // Handle initial load and cleanup
  useEffect(() => {
    // Only fetch if we haven't already fetched and lazy loading is disabled
    if (!dataFetchedRef.current && !lazy) {
      fetchData();
    }
    
    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, lazy]);

  // Handle filter changes
  useEffect(() => {
    // Reset state when filter changes
    if (dataFetchedRef.current) {
      setChartData([]);
      setLoading(true);
      setError(null);
      setHasMore(true);
      dataFetchedRef.current = false;
      
      // Fetch fresh data with the new filter
      fetchData({ isRefresh: true });
    }
  }, [timeFilter, type, fetchData]);

  // Handle loading more data
  const loadMore = useCallback(() => {
    // Prevent multiple simultaneous load more requests
    if (!loading && !isRefreshing && hasMore) {
      console.log('Loading more data, current offset:', chartData.length);
      
      fetchData({
        isLoadMore: true,
        currentOffset: chartData.length
      }).catch(err => {
        console.error('Error in loadMore:', err);
        // Don't show error to user for loadMore to prevent blocking UI
      });
    }
  }, [loading, isRefreshing, hasMore, chartData.length, fetchData]);

  // Handle pull-to-refresh
  const refreshData = useCallback(() => {
    if (!loading && !isRefreshing) {
      console.log('Refreshing data...');
      setIsRefreshing(true);
      
      fetchData({ 
        isRefresh: true,
        currentOffset: 0 // Reset offset on refresh
      }).finally(() => {
        setIsRefreshing(false);
      });
    }
  }, [fetchData, loading, isRefreshing]);

  return {
    chartData,
    loading,
    error,
    lastUpdated,
    hasMore,
    isRefreshing,
    refreshData,
    loadMore
  };
};
