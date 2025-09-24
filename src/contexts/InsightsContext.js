import { forceRefreshInsight, generateInsight, getInsightStatus } from '@services/ai/geminiAPI';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const InsightsContext = createContext();

// Environment check for production
const isProduction = __DEV__ === false;

/**
 * Silent logging that only shows in development
 */
const silentLog = (message, ...args) => {
  if (!isProduction) {
    console.log(message, ...args);
  }
};

/**
 * Silent error logging that only shows in development
 */
const silentError = (message, error) => {
  if (!isProduction) {
    console.error(message, error);
  }
};

export const InsightsProvider = ({ children }) => {
  const [insights, setInsights] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [errorStates, setErrorStates] = useState(new Map());

  // Generate insight for a specific component
  const generateComponentInsight = useCallback(async (componentId, sensorData, forceRefresh = false) => {
    if (!sensorData) {
      const errorMsg = 'No sensor data available';
      setErrorStates(prev => new Map(prev).set(componentId, errorMsg));
      silentError(`Component ${componentId}: ${errorMsg}`);
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

      silentLog(`✅ Generated insight for component ${componentId}`);
      return insight;
    } catch (error) {
      const errorMsg = 'Failed to generate AI insight';
      silentError(`Component ${componentId}: ${errorMsg}`, error);
      setErrorStates(prev => new Map(prev).set(componentId, errorMsg));
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
    if (!sensorData) {
      silentError('No sensor data provided for refresh');
      return;
    }

    const componentIds = Array.from(insights.keys());
    if (componentIds.length === 0) {
      silentLog('No components to refresh');
      return;
    }

    silentLog(`🔄 Refreshing insights for ${componentIds.length} components`);

    const refreshPromises = componentIds.map(componentId =>
      generateComponentInsight(componentId, sensorData, true)
    );

    try {
      await Promise.allSettled(refreshPromises);
      silentLog('✅ All insights refreshed successfully');
    } catch (error) {
      silentError('Error during bulk refresh:', error);
    }
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
        silentLog(`⏰ Auto-refreshing insights for components: ${componentsToRefresh.join(', ')}`);
        // Note: This would need sensor data to be passed, which should be handled by individual components
      }
    }, 60 * 1000); // Check every minute

    return () => {
      clearInterval(interval);
      silentLog('🧹 Auto-refresh interval cleared');
    };
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
