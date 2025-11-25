import { GEMINI_API_KEY } from "@env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Component-specific cache and timing
const componentCache = new Map();
const componentTimers = new Map();
const FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Request deduplication and batching
const pendingRequests = new Map(); // key -> Promise
const requestQueue = new Map(); // componentId -> queued requests

// Global quota management
let isQuotaExceeded = false;
let quotaResetTime = null;
const QUOTA_COOLDOWN_PERIOD = 15 * 60 * 1000; // 15-minute cooldown

// Cache keys
const CACHE_PREFIX = 'gemini_insights_';
const CACHE_EXPIRY_PREFIX = 'gemini_insights_expiry_';

// Intelligent error handling
let circuitBreakerFailures = 0;
let circuitBreakerLastFailure = null;
let circuitBreakerState = 'closed'; // 'closed', 'open', 'half-open'
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60 * 1000; // 1 minute
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

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
 * Generate insight using Gemini API with retry and circuit breaker
 */
const generateInsightFromAPI = async (sensorData) => {
  // Check circuit breaker first
  const circuitState = checkCircuitBreaker();
  if (circuitState === 'open') {
    silentLog("🚫 Circuit breaker is open - returning cached response");
    throw new Error("Circuit breaker is open");
  }

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

  // Use retry with exponential backoff for API calls
  return retryWithBackoff(async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Based on the following pond/tank water quality sensor data, provide analysis and simple recommendations for FISH FARMERS.
    The data is: ${JSON.stringify(sensorData)}

    CRITICAL: Use extremely simple, everyday language that a fish farmer with no scientific training can understand.
    - Avoid technical terms like "alkalinity", "acidification", "reduce alkalinity", etc.
    - Use common farmer terms like "baking soda", "farm lime", "clean filters", "change some water", etc.
    - Make each recommendation a clear action that farmers can do TODAY.
    - Keep instructions very practical and easy to follow.

    Examples of good simple language:
    ✅ "Add baking soda to raise pH level"
    ✅ "Change 20% of the water daily"
    ✅ "Clean the filter and make sure water flows well"
    ❌ "Implement pH buffer saturation" or "Regulate carbonate equilibrium"

    Please return a JSON object with the following structure:
    {
      "insights": {
        "overallInsight": "One simple sentence about your pond water quality using everyday language.",
        "timestamp": "${new Date().toISOString()}",
        "source": "gemini-ai"
      },
      "suggestions": [
        {
          "parameter": "pH",
          "influencingFactors": [
            "Fish waste making water more acidic",
            "Too much fish food leftover",
            "Heavy rainfall washing in acids from soil"
          ],
          "recommendedActions": [
            "Add a spoonful of baking soda or farm lime daily until pH rises",
            "Remove uneaten fish food from the pond",
            "Do a 20% water change by removing old water and adding fresh water"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "temperature",
          "influencingFactors": [
            "Hot sun during afternoon",
            "Using shallow water in pond",
            "No shade over the pond"
          ],
          "recommendedActions": [
            "Put shade cloth or tarp over part of the pond",
            "Add more water depth to pond",
            "Move pond location away from direct hot sun"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "salinity",
          "influencingFactors": [
            "Using too much salt for fish health",
            "Not adding salt regularly",
            "Heavy rain diluting the salt level"
          ],
          "recommendedActions": [
            "Reduce salt feeding by half for a few days",
            "Add 2 tablespoons of salt per 10 gallons of water daily",
            "Gradually add salt back over 3-4 days after rain"
          ],
          "status": "normal|warning|critical"
        },
        {
          "parameter": "turbidity",
          "influencingFactors": [
            "Fish stirring up bottom mud",
            "Too many fish in small pond",
            "Filter not clean or not strong enough"
          ],
          "recommendedActions": [
            "Don't overfeed fish to reduce their activity",
            "Clean filter daily and make sure water flows through well",
            "Add a settling pond or reduce fish number"
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
  });
};

/**
 * Circuit breaker implementation
 */
const checkCircuitBreaker = () => {
  const now = Date.now();

  if (circuitBreakerState === 'open') {
    if (now - (circuitBreakerLastFailure || 0) > CIRCUIT_BREAKER_TIMEOUT) {
      circuitBreakerState = 'half-open';
      silentLog('🔄 Circuit breaker moving to half-open state');
      return 'half-open';
    }
    return 'open';
  }

  return circuitBreakerState;
};

const recordFailure = () => {
  circuitBreakerFailures++;
  circuitBreakerLastFailure = Date.now();

  if (circuitBreakerFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
    circuitBreakerState = 'open';
    silentLog(`🚫 Circuit breaker opened after ${circuitBreakerFailures} failures`);
  }
};

const recordSuccess = () => {
  if (circuitBreakerState === 'half-open') {
    circuitBreakerState = 'closed';
    circuitBreakerFailures = 0;
    silentLog('✅ Circuit breaker closed - service restored');
  }
};

/**
 * Exponential backoff delay calculation
 */
const calculateRetryDelay = (attempt) => {
  const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * delay; // Add jitter
  return Math.min(delay + jitter, MAX_RETRY_DELAY);
};

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = MAX_RETRIES) => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      attempts++;
      const result = await fn();
      recordSuccess(); // Reset circuit breaker on success
      return result;
    } catch (error) {
      silentError(`Attempt ${attempts} failed:`, error.message);

      // Don't retry quota exceeded errors
      if (error.message && error.message.includes("[429")) {
        recordFailure();
        throw error;
      }

      if (attempts >= maxRetries) {
        recordFailure();
        throw error;
      }

      const delay = calculateRetryDelay(attempts);
      silentLog(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Create a unique request key for deduplication
 */
const createRequestKey = (componentId, dataHash) => {
  return `${componentId}_${dataHash}`;
};

/**
 * Get or create a pending request (deduplication)
 */
const getOrCreatePendingRequest = async (requestKey, sensorData, componentId, dataHash) => {
  if (pendingRequests.has(requestKey)) {
    silentLog(`🚦 Using pending request for ${componentId}`);
    return pendingRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    try {
      // Core insight generation logic
      const insight = await generateInsightCore(sensorData, componentId, dataHash);
      return insight;
    } finally {
      pendingRequests.delete(requestKey);
    }
  })();

  pendingRequests.set(requestKey, requestPromise);
  return requestPromise;
};

/**
 * Core insight generation logic (extracted for deduplication)
 */
const generateInsightCore = async (sensorData, componentId, dataHash) => {
  // Try to get cached data first
  const cachedInsight = await getCachedInsight(componentId, dataHash);
  if (cachedInsight && !shouldFetchNewData(componentId)) {
    silentLog(`⏰ Component ${componentId} is within fetch interval, using cached data`);
    return cachedInsight;
  }

  try {
    silentLog(`🔄 Fetching new insight for component ${componentId}`);
    updateComponentFetchTime(componentId);

    const newInsight = await generateInsightFromAPI(sensorData);

    // Cache the new insight
    await cacheInsight(componentId, dataHash, newInsight);

    return newInsight;
  } catch (error) {
    silentError(`❌ Error fetching new insight for component ${componentId}:`, error);

    // Return cached data if available, otherwise fallback
    if (cachedInsight) {
      silentLog(`📦 Returning cached insight as fallback for component ${componentId}`);
      return {
        ...cachedInsight,
        insights: {
          ...cachedInsight.insights,
          source: "cached-fallback"
        }
      };
    }

    // Generate fallback response
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
  const requestKey = createRequestKey(componentId, dataHash);

  return getOrCreatePendingRequest(requestKey, sensorData, componentId, dataHash);
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
