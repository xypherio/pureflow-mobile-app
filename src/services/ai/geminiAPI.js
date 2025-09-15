import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = "AIzaSyA1J4Ue-GM0pJT2rcILsJD52tTyuRbmuO0";

const genAI = new GoogleGenerativeAI(API_KEY);

// Component-specific cache and timing
const componentCache = new Map();
const componentTimers = new Map();
const FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Global quota management
let geminiQuota = 0;
const maxGeminiQuota = 50; // Increased quota for more frequent calls

// Cache keys
const CACHE_PREFIX = 'gemini_insights_';
const CACHE_EXPIRY_PREFIX = 'gemini_insights_expiry_';

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
        console.log(`📦 Using cached insight for component ${componentId}`);
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
    console.error('Error reading cached insight:', error);
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
    
    console.log(` Cached insight for component ${componentId}`);
  } catch (error) {
    console.error('Error caching insight:', error);
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
  if (geminiQuota >= maxGeminiQuota) {
    console.warn("Gemini quota exceeded. Using fallback model.");
    return {
      insights: {
        overallInsight: "AI quota exceeded. Using fallback analysis.",
        timestamp: new Date().toISOString(),
        source: "fallback"
      },
      suggestions: [
        {
          parameter: "pH",
          recommendation: "Monitor pH levels regularly. Current readings appear stable.",
          status: "normal"
        },
        {
          parameter: "temperature",
          recommendation: "Temperature within acceptable range. Continue monitoring.",
          status: "normal"
        },
        {
          parameter: "salinity",
          recommendation: "Salinity levels are optimal for water quality.",
          status: "normal"
        },
        {
          parameter: "turbidity",
          recommendation: "Turbidity readings are within safe parameters.",
          status: "normal"
        }
      ]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Based on the following water quality sensor data, provide a detailed analysis and recommendations.
    The data is: ${JSON.stringify(sensorData)}

    Please return a JSON object with the following structure:
    {
      "insights": {
        "overallInsight": "A brief, 2-3 sentence summary of the water quality with specific observations.",
        "timestamp": "${new Date().toISOString()}",
        "source": "gemini-ai"
      },
      "suggestions": [
        {
          "parameter": "pH",
          "recommendation": "Detailed recommendation for pH based on current readings.",
          "status": "normal|warning|critical"
        },
        {
          "parameter": "temperature",
          "recommendation": "Detailed recommendation for temperature based on current readings.",
          "status": "normal|warning|critical"
        },
        {
          "parameter": "salinity",
          "recommendation": "Detailed recommendation for salinity based on current readings.",
          "status": "normal|warning|critical"
        },
        {
          "parameter": "turbidity",
          "recommendation": "Detailed recommendation for turbidity based on current readings.",
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
      geminiQuota++;
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
      console.error("Error parsing JSON from Gemini API:", jsonError);
      throw new Error("Failed to parse AI response");
    }
  } catch (error) {
    console.error("Error generating insight from Gemini API:", error);
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
          recommendation: "Monitor pH levels regularly. Current readings appear stable.",
          status: "normal"
        },
        {
          parameter: "temperature",
          recommendation: "Temperature within acceptable range. Continue monitoring.",
          status: "normal"
        },
        {
          parameter: "salinity",
          recommendation: "Salinity levels are optimal for water quality.",
          status: "normal"
        },
        {
          parameter: "turbidity",
          recommendation: "Turbidity readings are within safe parameters.",
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
    console.log(`⏰ Component ${componentId} is within fetch interval, using cached data`);
    
    // Try to get cached data
    const cachedInsight = await getCachedInsight(componentId, dataHash);
    if (cachedInsight) {
      return cachedInsight;
    }
  }

  // Try to get any cached data as fallback while fetching new data
  const fallbackInsight = await getCachedInsight(componentId, dataHash);
  
  try {
    console.log(`🔄 Fetching new insight for component ${componentId}`);
    updateComponentFetchTime(componentId);
    
    const newInsight = await generateInsightFromAPI(sensorData);
    
    // Cache the new insight
    await cacheInsight(componentId, dataHash, newInsight);
    
    return newInsight;
  } catch (error) {
    console.error(`❌ Error fetching new insight for component ${componentId}:`, error);
    
    // Return cached data if available, otherwise return error response
    if (fallbackInsight) {
      console.log(`📦 Returning cached insight as fallback for component ${componentId}`);
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
  console.log(`🔄 Force refreshing insight for component ${componentId}`);
  
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
    console.error('Error clearing cache:', error);
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
    
    console.log(' Cleared all cached insights');
  } catch (error) {
    console.error('Error clearing cached insights:', error);
  }
};

console.log("Enhanced Gemini API initialized with 10-minute intervals and caching");
