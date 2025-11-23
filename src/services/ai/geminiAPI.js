import { GEMINI_API_KEY } from "@env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Component-specific cache and timing
const componentCache = new Map();
const componentTimers = new Map();
const FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Global quota management
let isQuotaExceeded = false;
let quotaResetTime = null;
const QUOTA_COOLDOWN_PERIOD = 15 * 60 * 1000; // 15-minute cooldown

// Cache keys
const CACHE_PREFIX = 'gemini_insights_';
const CACHE_EXPIRY_PREFIX = 'gemini_insights_expiry_';

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

/**
 * Generate a cache key for a component
 */
const getCacheKey = (componentId, dataHash) => {
  return `${CACHE_PREFIX}${componentId}_${dataHash}`;
};

/**
 * Generate an expiry cache key for a component
 */
const getExpiryKey = (componentId) => {
  return `${CACHE_EXPIRY_PREFIX}${componentId}`;
};

/**
 * Create a simple hash of the sensor data for cache key
 */
const createDataHash = (sensorData) => {
  const dataString = JSON.stringify(sensorData);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Get cached insight for a component
 */
const getCachedInsight = async (componentId, dataHash) => {
  try {
    const cacheKey = getCacheKey(componentId, dataHash);
    const expiryKey = getExpiryKey(componentId);

    const [cachedData, expiryTime] = await Promise.all([
      AsyncStorage.getItem(cacheKey),
      AsyncStorage.getItem(expiryKey)
    ]);

    if (cachedData && expiryTime) {
      const now = Date.now();
      const expiry = parseInt(expiryTime);

      if (now < expiry) {
        silentLog(`📦 Using cached insight for component ${componentId}`);
        return JSON.parse(cachedData);
      } else {
        // Cache expired, clean up
        await Promise.all([
          AsyncStorage.removeItem(cacheKey),
          AsyncStorage.removeItem(expiryKey)
        ]);
      }
    }
  } catch (error) {
    silentError('Error reading cached insight:', error);
  }

  return null;
};

/**
 * Cache insight for a component
 */
const cacheInsight = async (componentId, dataHash, insight) => {
  try {
    const cacheKey = getCacheKey(componentId, dataHash);
    const expiryKey = getExpiryKey(componentId);
    const expiryTime = Date.now() + FETCH_INTERVAL;

    await Promise.all([
      AsyncStorage.setItem(cacheKey, JSON.stringify(insight)),
      AsyncStorage.setItem(expiryKey, expiryTime.toString())
    ]);

    silentLog(`💾 Cached insight for component ${componentId}`);
  } catch (error) {
    silentError('Error caching insight:', error);
  }
};

/**
 * Check if component should fetch new data
 */
const shouldFetchNewData = (componentId) => {
  const lastFetch = componentCache.get(componentId);
  if (!lastFetch) return true;

  const now = Date.now();
  return (now - lastFetch) >= FETCH_INTERVAL;
};

/**
 * Update component fetch timestamp
 */
const updateComponentFetchTime = (componentId) => {
  componentCache.set(componentId, Date.now());
};

/**
 * Generate insight using Gemini API
 */
const generateInsightFromAPI = async (sensorData) => {
  // If quota was exceeded, check if cooldown is over
  if (isQuotaExceeded && quotaResetTime && Date.now() > quotaResetTime) {
    isQuotaExceeded = false; // Cooldown finished, allow requests again
    quotaResetTime = null;
    silentLog("✨ Gemini API cooldown finished. Resuming requests.");
  }

  // If quota is still exceeded, return a fallback response immediately
  if (isQuotaExceeded) {
    silentLog("🛑 Gemini API quota exceeded. Cooldown active.");
    return {
      insights: {
        overallInsight: "AI features are temporarily unavailable due to high demand. Please try again later.",
        timestamp: new Date().toISOString(),
        source: "quota-fallback"
      },
      suggestions: []
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Based on the following water quality sensor data, provide a detailed analysis and recommendations.
    The data is: ${JSON.stringify(sensorData)}

    Please return a JSON object with the following structure:
    {
      "insights": {
        "overallInsight": "A brief, 1 sentence summary of the water quality with specific observations.",
        "timestamp": "${new Date().toISOString()}",
        "source": "gemini-ai"
      },
      "suggestions": [
        {
          "parameter": "pH",
          "influencingFactors": [
            "Factor 1 affecting pH",
            "Factor 2 affecting pH",
            "Factor 3 affecting pH"
          ],
          "recommendedActions": [
            "Action 1 for pH management",
            "Action 2 for pH management",
            "Action 3 for pH management"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "temperature",
          "influencingFactors": [
            "Factor 1 affecting temperature",
            "Factor 2 affecting temperature",
            "Factor 3 affecting temperature"
          ],
          "recommendedActions": [
            "Action 1 for temperature control",
            "Action 2 for temperature control",
            "Action 3 for temperature control"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "salinity",
          "influencingFactors": [
            "Factor 1 affecting salinity",
            "Factor 2 affecting salinity",
            "Factor 3 affecting salinity"
          ],
          "recommendedActions": [
            "Action 1 for salinity management",
            "Action 2 for salinity management",
            "Action 3 for salinity management"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "turbidity",
          "influencingFactors": [
            "Factor 1 affecting turbidity",
            "Factor 2 affecting turbidity",
            "Factor 3 affecting turbidity"
          ],
          "recommendedActions": [
            "Action 1 for turbidity control",
            "Action 2 for turbidity control",
            "Action 3 for turbidity control"
          ],
          "status": "normal|warning|critical"
        }
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to ensure it's valid JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(cleanedText);

      // Ensure the response has the expected structure
      return {
        insights: {
          overallInsight: parsedResponse.insights?.overallInsight || "Analysis completed successfully.",
          timestamp: parsedResponse.insights?.timestamp || new Date().toISOString(),
          source: parsedResponse.insights?.source || "gemini-ai"
        },
        suggestions: parsedResponse.suggestions || []
      };
    } catch (jsonError) {
      silentError("Error parsing JSON from Gemini API:", jsonError);
      throw new Error("Failed to parse AI response");
    }
  } catch (error) {
    silentError("Error generating insight from Gemini API:", error);

    // Check if the error is a 429 quota exceeded error
    if (error.message && error.message.includes("[429 ")) {
      silentLog("🚫 Gemini API quota limit reached. Activating cooldown.");
      isQuotaExceeded = true;
      quotaResetTime = Date.now() + QUOTA_COOLDOWN_PERIOD;
    }
    // If there's an API error, return a fallback response instead of re-throwing
    return {
      insights: {
        overallInsight: "AI service currently unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
        source: "api-error-fallback"
      },
      suggestions: [
        {
          parameter: "pH",
          influencingFactors: [
            "Rainfall intensity affecting water dilution",
            "Temperature fluctuations impacting solubility",
            "Low sunlight reducing photosynthesis"
          ],
          recommendedActions: [
            "Monitor pH levels regularly to maintain balance",
            "Adjust feeding schedules based on water conditions",
            "Check ammonia and nitrite levels frequently"
          ],
          status: "normal"
        },
        {
          parameter: "temperature",
          influencingFactors: [
            "Ambient air temperature variations",
            "Direct sunlight exposure",
            "Water evaporation rates"
          ],
          recommendedActions: [
            "Maintain stable shading in tanks",
            "Install temperature monitoring systems",
            "Use heaters or coolers as needed"
          ],
          status: "normal"
        },
        {
          parameter: "salinity",
          influencingFactors: [
            "Rate of water evaporation",
            "Freshwater input volumes",
            "Salt addition scheduling"
          ],
          recommendedActions: [
            "Monitor salinity levels daily",
            "Gradually adjust salt concentrations",
            "Balance freshwater replacement"
          ],
          status: "normal"
        },
        {
          parameter: "turbidity",
          influencingFactors: [
            "Feed particle suspension",
            "Fish activity and movement",
            "Bottom substrate disturbance"
          ],
          recommendedActions: [
            "Reduce overfeeding to minimize particles",
            "Use appropriate filtration systems",
            "Regular tank cleaning schedules"
          ],
          status: "normal"
        }
      ]
    };
  }
};

/**
 * Main function to generate insights with caching and fallback
 */
export const generateInsight = async (sensorData, componentId = 'default') => {
  if (!sensorData) {
    return {
      insights: {
        overallInsight: "No sensor data available for analysis.",
        timestamp: new Date().toISOString(),
        source: "error"
      },
      suggestions: []
    };
  }

  const dataHash = createDataHash(sensorData);

  // Check if we should fetch new data
  if (!shouldFetchNewData(componentId)) {
    silentLog(`⏰ Component ${componentId} is within fetch interval, using cached data`);

    // Try to get cached data
    const cachedInsight = await getCachedInsight(componentId, dataHash);
    if (cachedInsight) {
      return cachedInsight;
    }
  }

  // Try to get any cached data as fallback while fetching new data
  const fallbackInsight = await getCachedInsight(componentId, dataHash);

  try {
    silentLog(`🔄 Fetching new insight for component ${componentId}`);
    updateComponentFetchTime(componentId);

    const newInsight = await generateInsightFromAPI(sensorData);

    // Cache the new insight
    await cacheInsight(componentId, dataHash, newInsight);

    return newInsight;
  } catch (error) {
    silentError(`❌ Error fetching new insight for component ${componentId}:`, error);

    // Return cached data if available, otherwise return error response
    if (fallbackInsight) {
      silentLog(`📦 Returning cached insight as fallback for component ${componentId}`);
      return {
        ...fallbackInsight,
        insights: {
          ...fallbackInsight.insights,
          source: "cached-fallback"
        }
      };
    }

    return {
      insights: {
        overallInsight: "Unable to generate insight at this time. Please try again later.",
        timestamp: new Date().toISOString(),
        source: "error"
      },
      suggestions: []
    };
  }
};

/**
 * Get insight status for a component
 */
export const getInsightStatus = (componentId) => {
  const lastFetch = componentCache.get(componentId);
  if (!lastFetch) return 'never-fetched';
  
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetch;
  
  if (timeSinceLastFetch < FETCH_INTERVAL) {
    const timeLeft = FETCH_INTERVAL - timeSinceLastFetch;
    return {
      status: 'cached',
      timeLeft: Math.ceil(timeLeft / (60 * 1000)), // minutes
      nextFetch: new Date(lastFetch + FETCH_INTERVAL).toLocaleString()
    };
  }
  
  return 'ready-to-fetch';
};

/**
 * Force refresh insight for a component (bypass cache)
 */
export const forceRefreshInsight = async (sensorData, componentId = 'default') => {
  silentLog(`🔄 Force refreshing insight for component ${componentId}`);
  
  // Clear cache for this component
  const dataHash = createDataHash(sensorData);
  try {
    const cacheKey = getCacheKey(componentId, dataHash);
    const expiryKey = getExpiryKey(componentId);
    await Promise.all([
      AsyncStorage.removeItem(cacheKey),
      AsyncStorage.removeItem(expiryKey)
    ]);
  } catch (error) {
    silentError('Error clearing cache:', error);
  }
  
  // Reset component fetch time
  componentCache.delete(componentId);
  
  // Generate new insight
  return generateInsight(sensorData, componentId);
};

/**
 * Clear all cached insights
 */
export const clearAllCachedInsights = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const insightKeys = keys.filter(key => 
      key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
    );
    
    await AsyncStorage.multiRemove(insightKeys);
    componentCache.clear();
    componentTimers.clear();
    
    silentLog('🧹 Cleared all cached insights');
  } catch (error) {
    silentError('Error clearing cached insights:', error);
  }
};

silentLog("Enhanced Gemini API initialized with 10-minute intervals and caching");
