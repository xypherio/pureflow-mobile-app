import { forceRefreshInsight, generateInsight, getInsightStatus } from '@services/ai/geminiAPI';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const InsightsContext = createContext();

export const InsightsProvider = ({ children }) => {
  const [insights, setInsights] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [errorStates, setErrorStates] = useState(new Map());

  // Generate insight for a specific component
  const generateComponentInsight = useCallback(async (componentId, sensorData, forceRefresh = false) => {
    if (!sensorData) {
      setErrorStates(prev => new Map(prev).set(componentId, 'No sensor data available'));
      return null;
    }

    setLoadingStates(prev => new Map(prev).set(componentId, true));
    setErrorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(componentId);
      return newMap;
    });

    try {
      const insight = forceRefresh 
        ? await forceRefreshInsight(sensorData, componentId)
        : await generateInsight(sensorData, componentId);

      setInsights(prev => new Map(prev).set(componentId, {
        ...insight,
        componentId,
        lastUpdated: new Date().toISOString(),
        status: getInsightStatus(componentId)
      }));

      return insight;
    } catch (error) {
      console.error(`Error generating insight for component ${componentId}:`, error);
      setErrorStates(prev => new Map(prev).set(componentId, error.message));
      return null;
    } finally {
      setLoadingStates(prev => new Map(prev).set(componentId, false));
    }
  }, []);

  // Get insight for a component
  const getComponentInsight = useCallback((componentId) => {
    return insights.get(componentId) || null;
  }, [insights]);

  // Get loading state for a component
  const isComponentLoading = useCallback((componentId) => {
    return loadingStates.get(componentId) || false;
  }, [loadingStates]);

  // Get error state for a component
  const getComponentError = useCallback((componentId) => {
    return errorStates.get(componentId) || null;
  }, [errorStates]);

  // Refresh all insights
  const refreshAllInsights = useCallback(async (sensorData) => {
    const componentIds = Array.from(insights.keys());
    const refreshPromises = componentIds.map(componentId => 
      generateComponentInsight(componentId, sensorData, true)
    );
    
    await Promise.allSettled(refreshPromises);
  }, [insights, generateComponentInsight]);

  // Auto-refresh insights based on 10-minute intervals
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const componentsToRefresh = [];
      
      insights.forEach((insight, componentId) => {
        const lastFetch = insight.lastUpdated ? new Date(insight.lastUpdated).getTime() : 0;
        const timeSinceLastFetch = now - lastFetch;
        
        if (timeSinceLastFetch >= 10 * 60 * 1000) { // 10 minutes
          componentsToRefresh.push(componentId);
        }
      });
      
      if (componentsToRefresh.length > 0) {
        console.log(`🔄 Auto-refreshing insights for components: ${componentsToRefresh.join(', ')}`);
        // Note: This would need sensor data to be passed, which should be handled by individual components
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [insights]);

  const value = {
    insights,
    generateComponentInsight,
    getComponentInsight,
    isComponentLoading,
    getComponentError,
    refreshAllInsights,
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = () => {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
};
