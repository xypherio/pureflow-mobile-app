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
      console.log('⏳ Fetching current day data from historicalDataService...');
      
      const data = await historicalDataService.getCurrentDayData();
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
      const recentData = data.reverse().slice(-50);
      console.log('✂️ Filtered to recent 50 readings:', {
        originalCount: data.length,
        filteredCount: recentData.length
      });
      
      setChartData(recentData);
      setLastUpdated(new Date());
      setError(null);
      
      console.log('✅ Home data fetch completed successfully');
    } catch (err) {
      console.error('❌ Error in fetchHomeData:', {
        error: err.message,
        stack: err.stack
      });
      
      setError('Failed to fetch data. Showing cached data if available.');
      
      // Try to get cached data
      try {
        console.log('🔄 Attempting to get cached data as fallback...');
        const cachedData = await historicalDataService.getCurrentDayData();
        
        if (cachedData.length > 0) {
          const recentData = cachedData.reverse().slice(-50);
          console.log('📦 Using cached data fallback:', {
            cachedCount: cachedData.length,
            recentCount: recentData.length
          });
          
          setChartData(recentData);
          setLastUpdated(new Date());
        } else {
          console.log('⚠️ No cached data available');
        }
      } catch (cacheErr) {
        console.error('❌ Cache fallback failed:', {
          error: cacheErr.message,
          stack: cacheErr.stack
        });
      }
    } finally {
      setLoading(false);
      console.log('🏁 fetchHomeData completed, loading set to false');
    }
  }, []);

  // Fetch data for reports tab (aggregated based on time filter)
  const fetchReportsData = useCallback(async (filter) => {
    try {
      setLoading(true);
      const { startDate, endDate } = historicalDataService.getDateRange(filter);
      const data = await historicalDataService.getAggregatedData(filter, startDate, endDate);
      
      setChartData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError('Failed to fetch data. Showing cached data if available.');
      // Try to get cached data
      try {
        const { startDate, endDate } = historicalDataService.getDateRange(filter);
        const cachedData = await historicalDataService.getAggregatedData(filter, startDate, endDate);
        if (cachedData.length > 0) {
          setChartData(cachedData);
          setLastUpdated(new Date());
        }
      } catch (cacheErr) {
        console.error('Cache fallback failed:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    if (type === 'home') {
      fetchHomeData();
    } else {
      fetchReportsData(timeFilter);
    }
  }, [type, timeFilter, fetchHomeData, fetchReportsData]);

  // Auto-refresh for home tab every 30 seconds
  useEffect(() => {
    if (type === 'home') {
      fetchHomeData();
      
      const interval = setInterval(() => {
        fetchHomeData();
      }, 30 * 1000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [type, fetchHomeData]);

  // Fetch reports data when time filter changes
  useEffect(() => {
    if (type === 'reports') {
      fetchReportsData(timeFilter);
    }
  }, [type, timeFilter, fetchReportsData]);

  // Clear expired cache entries periodically
  useEffect(() => {
    const cacheCleanupInterval = setInterval(() => {
      historicalDataService.clearExpiredCache();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(cacheCleanupInterval);
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