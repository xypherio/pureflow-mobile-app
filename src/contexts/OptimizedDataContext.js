/**
 * Optimized Data Context for efficient data distribution without unnecessary re-renders
 * 
 * This context provides data to components in a way that prevents unnecessary re-renders
 * by using stable references and selective updates.
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { optimizedDataManager } from '../services/OptimizedDataManager';

const OptimizedDataContext = createContext();

/**
 * Optimized Data Provider that manages data distribution efficiently
 */
export function OptimizedDataProvider({ children, servicesReady = true }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [realtimeData, setRealtimeData] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [dataAge, setDataAge] = useState('No data');
  
  const subscriberId = useRef(`provider_${Date.now()}`);
  const isMounted = useRef(true);

  // Initialize the data manager only when services are ready
  useEffect(() => {
    // Wait for services to be ready before initializing
    if (!servicesReady) {
      console.log('⏳ Waiting for services to be ready before initializing OptimizedDataManager...');
      return;
    }

    const initializeData = async () => {
      try {
        console.log('🚀 Initializing OptimizedDataManager now that services are ready');
        await optimizedDataManager.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing OptimizedDataProvider:', error);
      }
    };

    initializeData();

    // Cleanup
    return () => {
      isMounted.current = false;
      // Note: No need to unsubscribe here as it's handled in the second useEffect
    };
  }, [servicesReady]); // Add servicesReady as dependency

  // Subscribe to data updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = optimizedDataManager.subscribe(
      subscriberId.current,
      (updateType, data) => {
        if (!isMounted.current) return;

        console.log(`📡 DataProvider received ${updateType} update`);

        switch (updateType) {
          case 'initialLoad':
            setChartData(data.chartData);
            setRealtimeData(data.realtimeData);
            setLastUpdateTime(data.lastUpdateTime);
            setDataAge(data.realtimeData?.timestamp ? optimizedDataManager.calculateDataAge(data.realtimeData.timestamp) : 'No data');
            break;

          case 'incrementalUpdate':
            // Only update if data actually changed
            if (data.realtimeData && data.realtimeData !== realtimeData) {
              setRealtimeData(data.realtimeData);
              setLastUpdateTime(data.lastUpdateTime);
              setDataAge(data.realtimeData.timestamp ? optimizedDataManager.calculateDataAge(data.realtimeData.timestamp) : 'No data');
            }
            
            // Update chart data with new point
            if (data.chartData && data.chartData !== chartData) {
              setChartData(data.chartData);
            }
            break;

          case 'current':
            setChartData(data.chartData);
            setRealtimeData(data.realtimeData);
            setLastUpdateTime(data.lastUpdateTime);
            setDataAge(data.dataAge);
            break;

          default:
            console.warn(`⚠️ Unknown update type: ${updateType}`);
        }
      }
    );

    return unsubscribe;
  }, [isInitialized, realtimeData, chartData]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Data
    chartData,
    realtimeData,
    lastUpdateTime,
    dataAge,
    isInitialized,
    
    // Helper functions
    getCurrentData: () => optimizedDataManager.getCurrentData(),
    
    // Status
    hasData: !!realtimeData,
    hasChartData: chartData.length > 0,
    
    // Metadata
    chartDataCount: chartData.length,
    lastUpdateTimestamp: lastUpdateTime,
  }), [
    chartData,
    realtimeData,
    lastUpdateTime,
    dataAge,
    isInitialized
  ]);

  // Don't render children until services are ready and we're initialized
  if (!servicesReady || !isInitialized) {
    console.log('⏳ Waiting for services and initialization before rendering children');
    return null; // Don't render anything until ready
  }

  return (
    <OptimizedDataContext.Provider value={contextValue}>
      {children}
    </OptimizedDataContext.Provider>
  );
}

/**
 * Hook to access optimized real-time data
 * This hook prevents unnecessary re-renders by using stable references
 */
export function useOptimizedRealtimeData() {
  const context = useContext(OptimizedDataContext);
  
  if (!context) {
    throw new Error('useOptimizedRealtimeData must be used within OptimizedDataProvider');
  }

  // Return stable references to prevent unnecessary re-renders
  return useMemo(() => ({
    data: context.realtimeData,
    hasData: context.hasData,
    dataAge: context.dataAge,
    lastUpdateTime: context.lastUpdateTime,
    isInitialized: context.isInitialized,
    
    // Stable helper functions
    getParameterValue: (parameter) => {
      return context.realtimeData?.[parameter] || null;
    },
    
    getAllParameters: () => {
      if (!context.realtimeData) return {};
      return {
        pH: context.realtimeData.pH,
        temperature: context.realtimeData.temperature,
        turbidity: context.realtimeData.turbidity,
        salinity: context.realtimeData.salinity,
      };
    },
  }), [
    context.realtimeData,
    context.hasData,
    context.dataAge,
    context.lastUpdateTime,
    context.isInitialized
  ]);
}

/**
 * Hook to access optimized chart data
 * This hook prevents unnecessary re-renders and provides incremental updates
 */
export function useOptimizedChartData(selectedParameter = null) {
  const context = useContext(OptimizedDataContext);
  
  if (!context) {
    throw new Error('useOptimizedChartData must be used within OptimizedDataProvider');
  }

  // Memoize processed chart data to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    if (!context.chartData || context.chartData.length === 0) {
      return { datasets: [], labels: [] };
    }

    // Process data for chart display
    const labels = context.chartData.map(item => 
      item.datetime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      })
    );

    const parameters = selectedParameter ? [selectedParameter] : ['pH', 'temperature', 'turbidity', 'salinity'];
    
    const datasets = parameters.map(param => ({
      data: context.chartData.map(item => item[param.toLowerCase()] || 0),
      parameter: param,
      name: param,
    }));

    return { datasets, labels };
  }, [context.chartData, selectedParameter]);

  // Return stable references
  return useMemo(() => ({
    chartData: context.chartData,
    processedData,
    hasData: context.hasChartData,
    dataCount: context.chartDataCount,
    lastUpdateTime: context.lastUpdateTime,
    isInitialized: context.isInitialized,
    
    // Helper functions
    getLatestValue: (parameter) => {
      const latest = context.chartData[context.chartData.length - 1];
      return latest?.[parameter.toLowerCase()] || null;
    },
    
    getDataRange: (parameter) => {
      if (!context.chartData || context.chartData.length === 0) return null;
      
      const values = context.chartData
        .map(item => item[parameter.toLowerCase()])
        .filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) return null;
      
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length
      };
    },
  }), [
    context.chartData,
    processedData,
    context.hasChartData,
    context.chartDataCount,
    context.lastUpdateTime,
    context.isInitialized
  ]);
}

/**
 * Hook to access all optimized data
 */
export function useOptimizedData() {
  const context = useContext(OptimizedDataContext);
  
  if (!context) {
    throw new Error('useOptimizedData must be used within OptimizedDataProvider');
  }

  return context;
}

export default OptimizedDataContext;
