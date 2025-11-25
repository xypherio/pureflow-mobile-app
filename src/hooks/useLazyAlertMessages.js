import { useState, useCallback } from 'react';

/**
 * Custom hook for lazy loading alert messages to reduce bundle size
 * Only loads messages when first requested for a parameter
 */
export function useLazyAlertMessages() {
  const [loadedMessages, setLoadedMessages] = useState(new Map());

  // Lazy load messages for a specific parameter
  const loadMessagesForParameter = useCallback(async (parameter) => {
    const paramKey = parameter?.toLowerCase();

    // Return cached if already loaded
    if (loadedMessages.has(paramKey)) {
      return loadedMessages.get(paramKey);
    }

    try {
      // Dynamic import based on parameter
      let messages;
      switch (paramKey) {
        case 'ph':
          const phModule = await import('../constants/alertMessages/ph.json');
          messages = phModule.default.messages;
          break;
        case 'temperature':
          const tempModule = await import('../constants/alertMessages/temperature.json');
          messages = tempModule.default.messages;
          break;
        case 'turbidity':
          const turbModule = await import('../constants/alertMessages/turbidity.json');
          messages = turbModule.default.messages;
          break;
        case 'salinity':
          const salModule = await import('../constants/alertMessages/salinity.json');
          messages = salModule.default.messages;
          break;
        case 'weather':
          const weatherModule = await import('../constants/alertMessages/weather.json');
          messages = weatherModule.default.messages;
          break;
        default:
          // Fallback message
          messages = [`${parameter || 'Parameter'} level is outside normal range and may affect aquaculture species.`];
          break;
      }

      // Cache the messages
      setLoadedMessages(prev => new Map(prev).set(paramKey, messages));
      return messages;
    } catch (error) {
      console.error(`Failed to load messages for parameter: ${parameter}`, error);
      // Return fallback
      const fallbackMessages = [`${parameter || 'Parameter'} level is outside normal range and may affect aquaculture species.`];
      setLoadedMessages(prev => new Map(prev).set(paramKey, fallbackMessages));
      return fallbackMessages;
    }
  }, [loadedMessages]);

  // Get random message for parameter (loads if not cached)
  const getRandomMessage = useCallback(async (parameter) => {
    const messages = await loadMessagesForParameter(parameter);
    if (!messages || messages.length === 0) {
      return `${parameter?.charAt(0).toUpperCase() + parameter?.slice(1) || 'Parameter'} level is outside normal range and may affect aquaculture species.`;
    }
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }, [loadMessagesForParameter]);

  // Preload commonly used parameters
  const preloadCommonParameters = useCallback(async () => {
    const commonParams = ['ph', 'temperature', 'turbidity', 'salinity'];
    await Promise.all(commonParams.map(param => loadMessagesForParameter(param)));
  }, [loadMessagesForParameter]);

  return {
    getRandomMessage,
    loadMessagesForParameter,
    preloadCommonParameters,
    loadedParameters: Array.from(loadedMessages.keys())
  };
}
