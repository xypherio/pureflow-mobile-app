import { useInsights } from '@contexts/InsightsContext';
import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for managing insights for a specific component
 */
export const useInsightManager = (componentId, sensorData, options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 15 * 60 * 1000, // 15 minutes - less aggressive
    onInsightUpdate = null
  } = options;

  const { 
    generateComponentInsight, 
    getComponentInsight, 
    isComponentLoading, 
    getComponentError 
  } = useInsights();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const insight = getComponentInsight(componentId);
  const loading = isComponentLoading(componentId);
  const error = getComponentError(componentId);

  // Generate initial insight
  useEffect(() => {
    if (sensorData && autoRefresh) {
      generateComponentInsight(componentId, sensorData);
    }
  }, [sensorData, componentId, autoRefresh, generateComponentInsight]);

  // Auto-refresh based on interval
  useEffect(() => {
    if (!autoRefresh || !sensorData) return;

    const interval = setInterval(() => {
      if (sensorData) {
        generateComponentInsight(componentId, sensorData);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, sensorData, componentId, refreshInterval, generateComponentInsight]);

  // Callback when insight updates
  useEffect(() => {
    if (insight && onInsightUpdate) {
      onInsightUpdate(insight);
    }
  }, [insight, onInsightUpdate]);

  const refreshInsight = useCallback(async (forceRefresh = false) => {
    if (!sensorData) return null;

    setIsRefreshing(true);
    try {
      const result = await generateComponentInsight(componentId, sensorData, forceRefresh);
      return result;
    } finally {
      setIsRefreshing(false);
    }
  }, [sensorData, componentId, generateComponentInsight]);

  const getInsightData = useCallback(() => {
    return {
      insight: insight?.insights?.overallInsight || null,
      suggestions: insight?.suggestions || [],
      lastUpdated: insight?.lastUpdated || null,
      source: insight?.insights?.source || 'unknown',
      status: insight?.status || 'unknown',
      loading: loading || isRefreshing,
      error: error
    };
  }, [insight, loading, isRefreshing, error]);

  return {
    insight: getInsightData(),
    refreshInsight,
    isRefreshing,
    loading,
    error
  };
};
