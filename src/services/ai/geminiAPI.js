import { GEMINI_API_KEY } from "@env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getWaterQualityThresholdsFromSettings, getWaterQualityThresholds } from '@constants/thresholds';

const API_KEY = Constants.expoConfig.extra?.GEMINI_API_KEY || GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Component-specific cache and timing
const componentCache = new Map();
const componentTimers = new Map();
const FETCH_INTERVAL = 15 * 60 * 1000; 

// Request deduplication and batching
const pendingRequests = new Map();
const requestQueue = new Map(); 

// Global quota management
let isQuotaExceeded = false;
let quotaResetTime = null;
const QUOTA_COOLDOWN_PERIOD = 5 * 60 * 1000; 

// Cache keys
const CACHE_PREFIX = 'gemini_insights_';
const CACHE_EXPIRY_PREFIX = 'gemini_insights_expiry_';

// Intelligent error handling
let circuitBreakerFailures = 0;
let circuitBreakerLastFailure = null;
let circuitBreakerState = 'closed';
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 10000;
const MAX_RETRY_DELAY = 100000;

// EMERGENCY DAILY RATE LIMITING - Gemini Free Tier: 20 requests/day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_REQUESTS = 12; // Increased to 12 (60% of 20/day limit) with prioritization
let requestTimestamps = [];

// Component prioritization - lower number = higher priority
const COMPONENT_PRIORITIES = {
  "home-overall-insight": 1,        // Highest priority - main user insights
  "forecast-overall-insight": 3,    // Lower priority - forecast insights
  "report": 2,                      // Medium priority - report generation
  "parameter": 4,                   // Lowest priority - detailed parameters
  "trend": 4,                       // Lowest priority - trends
  "alert": 4,                       // Lowest priority - alerts
  "default": 5                      // Fallback - very low priority
};

// Emergency AI disable flag - when quota is critically low
let aiCompletelyDisabled = false;

/**
 * Generate intelligent static fallback responses when AI is unavailable
 * Provides meaningful, personalized insights based on sensor data analysis
 */
const generateStaticFallbackResponse = async (sensorData, componentId = 'default') => {
  let userNickname = null;
  let fishpondType = 'freshwater';

  try {
    const savedSettings = await AsyncStorage.getItem('pureflowSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      userNickname = settings.nickname?.trim();
      fishpondType = settings.fishpondType || 'freshwater';
    }
  } catch (error) {
    // Continue without personalization
  }

  const user = userNickname ? userNickname : "my friend";

  // Analyze water quality status using dynamic thresholds
  const getQualityAssessment = async (data) => {
    const params = ['pH', 'temperature', 'salinity', 'turbidity'];
    const thresholds = await getWaterQualityThresholdsFromSettings();

    const issues = [];
    const warnings = [];
    const approaching = [];

    params.forEach(param => {
      const value = data[param];
      if (value != null && !isNaN(value)) {
        const threshold = thresholds[param];
        if (threshold) {
          const distanceToMin = value - threshold.min;
          const distanceToMax = threshold.max - value;

          if (value < threshold.min) {
            issues.push(`${param.toLowerCase()} is low (${value}, threshold: ${threshold.min}-${threshold.max})`);
          } else if (value > threshold.max) {
            issues.push(`${param.toLowerCase()} is high (${value}, threshold: ${threshold.min}-${threshold.max})`);
          } else if (distanceToMin <= 0.3) { // Within 0.3 units of minimum threshold
            approaching.push(`${param.toLowerCase()} is approaching minimum threshold (${value}, ideal: ${threshold.min}-${threshold.max})`);
          } else if (distanceToMax <= 0.5) { // Within 0.5 units of maximum threshold
            approaching.push(`${param.toLowerCase()} is approaching maximum threshold (${value}, ideal: ${threshold.min}-${threshold.max})`);
          }
        }
      }
    });

    return { issues, warnings: approaching, thresholds };
  };

  const { issues, warnings } = await getQualityAssessment(sensorData);

  // Generate personalized response based on assessment
  let overallInsight;
  let suggestions = [];

  if (issues.length === 0) {
    // Excellent water quality
    overallInsight = `Excellent news, ${user}! Your pond water quality looks perfect. All parameters are within ideal ranges - keep up the great work managing your fish farm!`;

    suggestions = [
      {
        parameter: "pH",
        influencingFactors: ["Balanced fish food", "Proper pond maintenance"],
        recommendedActions: ["Maintain current feeding schedule", "Test water weekly to confirm stability"],
        status: "normal"
      },
      {
        parameter: "temperature",
        influencingFactors: ["Good weather patterns", "Adequate shade"],
        recommendedActions: ["Continue providing shade during hot days", "Monitor for sudden weather changes"],
        status: "normal"
      }
    ];
  } else if (issues.length >= 2) {
    // Critical situations
    overallInsight = `Oh no, ${user}! There are several water quality concerns that need immediate attention. Your fish might be stressed - please address these issues right away to prevent health problems.`;

    if (issues.some(issue => issue.includes('ph'))) {
      suggestions.push({
        parameter: "pH",
        influencingFactors: ["Fish waste buildup", "Old water needing change"],
        recommendedActions: ["Add baking soda (1 tsp per 10 gallons) daily until pH rises", "Do a 20% water change tomorrow", "Reduce fish food by half for 3 days"],
        status: "critical"
      });
    }
    if (issues.some(issue => issue.includes('temperature'))) {
      suggestions.push({
        parameter: "temperature",
        influencingFactors: ["Too much sun exposure", "Hot weather"],
        recommendedActions: ["Install shade cloth over pond immediately", "Add pond depth with new water if possible", "Provide extra aeration today"],
        status: "critical"
      });
    }
    if (issues.some(issue => issue.includes('turbidity'))) {
      suggestions.push({
        parameter: "turbidity",
        influencingFactors: ["Bottom mud disturbance", "Too many fish", "Dirty filter"],
        recommendedActions: ["Clean filter thoroughly right now", "Reduce feeding by half for 2 days", "Add a settling pond section if possible"],
        status: "critical"
      });
    }
  } else {
    // Warning situations
    overallInsight = `Hey ${user}, your water quality needs some attention but it's not critical yet. Addressing these concerns promptly will keep your fish healthy and happy.`;

    if (issues.some(issue => issue.includes('ph'))) {
      suggestions.push({
        parameter: "pH",
        influencingFactors: ["Gradual acid buildup"],
        recommendedActions: ["Add baking soda (½ tsp per 10 gallons) daily for 3 days", "Test pH every other day to check progress"],
        status: "warning"
      });
    }
    if (issues.some(issue => issue.includes('temperature'))) {
      suggestions.push({
        parameter: "temperature",
        influencingFactors: ["Summer heat approaching"],
        recommendedActions: ["Add more shade cloth to pond", "Check water depth - aim for 3-4 feet", "Monitor temperature twice daily"],
        status: "warning"
      });
    }
    if (issues.some(issue => issue.includes('salinity'))) {
      suggestions.push({
        parameter: "salinity",
        influencingFactors: ["Recent rainfall", "Salt not mixed evenly"],
        recommendedActions: ["Add 2 tablespoons salt per 10 gallons of pond water", "Mix thoroughly and test in 24 hours", "Add salt gradually over several days"],
        status: "warning"
      });
    }
  }

  // Add general maintenance suggestions
  if (suggestions.length < 4) {
    suggestions.push({
      parameter: "maintenance",
      influencingFactors: ["Regular pond care"],
      recommendedActions: ["Clean filters weekly", "Test all water parameters every 3 days", "Feed fish according to stocking density"],
      status: "normal"
    });
  }

  return {
    insights: {
      overallInsight,
      timestamp: new Date().toISOString(),
      source: "static-fallback"
    },
    suggestions: suggestions.slice(0, 4) // Limit to 4 suggestions
  };
};

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
 * Normalize sensor data values to reduce cache misses from minor fluctuations
 */
const normalizeSensorData = (sensorData) => {
  const thresholds = {
    pH: 0.1,        // Round to 1 decimal place (0.1 precision)
    temperature: 1, // Round to 1°C precision
    salinity: 0.5,  // Round to 0.5 precision
    turbidity: 5,   // Round to 5 NTU precision
  };

  const normalized = { ...sensorData };

  // Apply rounding to reduce cache misses from minor changes
  Object.keys(thresholds).forEach(param => {
    if (normalized[param] != null && !isNaN(normalized[param])) {
      const precision = thresholds[param];
      normalized[param] = Math.round(normalized[param] / precision) * precision;
    }
  });

  return normalized;
};

/**
 * Create a simple hash of the normalized sensor data for cache key
 */
const createDataHash = (sensorData) => {
  const normalizedData = normalizeSensorData(sensorData);
  const dataString = JSON.stringify(normalizedData);
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
 * @param {Object} sensorData - The sensor data to analyze
 * @param {string} componentId - The component ID to determine which model to use
 */
const generateInsightFromAPI = async (sensorData, componentId) => {
  // Check rate limiting first with component prioritization
  if (shouldRateLimit(componentId)) {
    silentLog(`🛑 Rate limit exceeded for component ${componentId} - returning rich fallback response`);
    return await generateStaticFallbackResponse(sensorData, componentId);
  }

  // Check circuit breaker first
  const circuitState = checkCircuitBreaker();
  if (circuitState === 'open') {
    silentLog("🚫 Circuit breaker is open - returning cached response");
    throw new Error("Circuit breaker is open");
  }

  // If quota was exceeded, check if cooldown is over
  if (isQuotaExceeded && quotaResetTime && Date.now() > quotaResetTime) {
    isQuotaExceeded = false;
    quotaResetTime = null;
    silentLog("✨ Gemini API cooldown finished. Resuming requests.");
  }

  // If quota is still exceeded, return rich static fallback response immediately
  if (isQuotaExceeded) {
    silentLog("🛑 Gemini API quota exceeded. Cooldown active.");
    return await generateStaticFallbackResponse(sensorData, componentId);
  }

  // Retrieve user settings for personalization
  let userNickname = null;
  let fishpondType = 'freshwater';
  try {
    const savedSettings = await AsyncStorage.getItem('pureflowSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      userNickname = settings.nickname?.trim();
      fishpondType = settings.fishpondType || 'freshwater';
    }
  } catch (error) {
    silentError('Error retrieving user settings for AI personalization:', error);
    userNickname = null;
    fishpondType = 'freshwater';
  }

  // Analyze overall water quality status for expressive responses using dynamic thresholds
  const getQualityStatus = async (data) => {
    const params = ['pH', 'temperature', 'salinity', 'turbidity'];
    let criticalCount = 0;
    let warningCount = 0;
    let approachingCount = 0;
    let normalCount = 0;

    const thresholds = await getWaterQualityThresholdsFromSettings();

    for (const param of params) {
      const value = data[param];
      if (value != null && !isNaN(value)) {
        const threshold = thresholds[param];
        if (threshold) {
          const distanceToMin = value - threshold.min;
          const distanceToMax = threshold.max - value;

          if (value < threshold.min || value > threshold.max) {
            criticalCount++;
          } else if (distanceToMin <= 0.3 || distanceToMax <= 0.5) {
            approachingCount++; // Parameters approaching limits
          } else {
            normalCount++;
          }
        } else {
          normalCount++; // Parameter without specific thresholds
        }
      }
    }

    if (criticalCount >= 2) return 'critical';
    if (criticalCount > 0) return 'warning';
    if (approachingCount > 0) return 'warning'; // Parameters approaching limits count as warnings
    if (normalCount > 0) return 'excellent';
    return 'unknown';
  };

  const qualityStatus = await getQualityStatus(sensorData);

  // Use retry with exponential backoff for API calls
  return retryWithBackoff(async () => {
    // Select model based on component ID - home tab gets full power model
    const modelName = componentId === "home-overall-insight"
      ? "gemini-2.5-flash"
      : "gemini-2.5-flash-lite";

    const model = genAI.getGenerativeModel({ model: modelName });

    // Determine the greeting style based on quality status
    const getGreetingStyle = (status, nickname) => {
      const user = nickname ? nickname : "my friend";

      switch (status) {
        case 'excellent':
          return {
            opening: `Excellent news, ${user}! `,
            tone: "positive and encouraging",
            examples: ["Great job!", "Fantastic work!", "Well done on maintaining"]
          };
        case 'warning':
          return {
            opening: `Hey ${user}, `,
            tone: "concerned but friendly",
            examples: ["let's address this concern", "we should take a look at this", "here's what we can do"]
          };
        case 'critical':
          return {
            opening: `Oh no, ${user}! `,
            tone: "urgently concerned",
            examples: ["we have a serious issue", "this needs immediate attention", "your water quality is poor"]
          };
        default:
          return {
            opening: `${user}, `,
            tone: "neutral and informative",
            examples: ["here's the current status", "let's review", "this is what we see"]
          };
      }
    };

    const greetingStyle = getGreetingStyle(qualityStatus, userNickname);

    // Get actual thresholds for analysis
    const actualThresholds = await getWaterQualityThresholdsFromSettings();

    const prompt = `
    Based on the following pond/tank water quality sensor data, provide analysis and simple recommendations for FISH FARMERS.
    The data is: ${JSON.stringify(sensorData)}
    Water quality thresholds for ${fishpondType} ponds: ${JSON.stringify(actualThresholds)}

    USER PERSONALIZATION:
    - User's nickname: ${userNickname || 'not set'}
    - Fish pond type: ${fishpondType}
    - Overall quality status: ${qualityStatus}
    - Greeting style: ${greetingStyle.tone}
    - Actual thresholds: ${JSON.stringify(actualThresholds)}

    ANALYSIS REQUIREMENTS:
    - Carefully analyze each parameter against its specific threshold values
    - Identify parameters that are NEARING the threshold limits (within 0.3-0.5 units of min/max)
    - Include specific threshold information in your analysis
    - Reference the actual threshold ranges in your reasoning

    RESPONSE STYLE REQUIREMENTS:
    - START your overall insight with: "${greetingStyle.opening}"
    - Address the user by their nickname "${userNickname || 'fish farmer'}" when appropriate
    - Use expressive greetings based on the quality status (examples: ${greetingStyle.examples.join(", ")})
    - Make the tone conversational and emotive, not clinical
    - SPECIFICALLY mention when parameters are approaching thresholds

    CRITICAL: Use extremely simple, everyday language that a fish farmer with no scientific training can understand.
    - Avoid technical terms like "alkalinity", "acidification", "reduce alkalinity", etc.
    - Use common farmer terms like "baking soda", "farm lime", "clean filters", "change some water", etc.
    - Make each recommendation a clear action that farmers can do TODAY.
    - Keep instructions very practical and easy to follow.
    - When mentioning thresholds, say things like "close to the ideal range of 6.5-8.5 for pH"

    Examples of good conversational language:
    ✅ GOOD: "Hey Alex, your pH is getting close to the ideal range of 6.5-8.5 - try adding some baking soda daily until it gets back to normal"
    ✅ EXCELLENT: "Fantastic work, Maria! Your water quality is looking perfect - keep it up!"
    ✅ CRITICAL: "Oh no, David! Your water is very cloudy and way above the 50 unit turbidity limit - clean that filter right away!"
    ❌ BAD: "The analysis indicates suboptimal pH levels require immediate corrective measures"

    Please return a JSON object with the following structure:
    {
      "insights": {
        "overallInsight": "Conversational paragraph about your pond water quality starting with appropriate greeting and addressing the user by name, mentioning specific thresholds when parameters are approaching limits.",
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
            "Add a spoonful of baking soda or farm lime daily until pH rises toward the ideal range of ${actualThresholds.pH.min}-${actualThresholds.pH.max}",
            "Remove uneaten fish food from the pond",
            "Do a 20% of the water change by removing old water and adding fresh water"
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

      // Record successful API request for rate limiting
      recordRequest();

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

    const newInsight = await generateInsightFromAPI(sensorData, componentId);

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

    // Generate rich static fallback response for errors
    silentLog(`🔄 Using rich static fallback for ${componentId} error`);
    return await generateStaticFallbackResponse(sensorData, componentId);
  }
};

/**
 * Main function to generate insights with caching and fallback
 */
export const generateInsight = async (sensorData, componentId = 'default') => {
  // Emergency AI disable check - return static response if AI is completely disabled
  if (aiCompletelyDisabled) {
    silentLog("🚫 AI completely disabled due to quota exhaustion");
    return {
      insights: {
        overallInsight: "AI insights are temporarily disabled. Please upgrade to a paid plan for full functionality. Using basic water quality recommendations.",
        timestamp: new Date().toISOString(),
        source: "ai-disabled"
      },
      suggestions: [
        {
          parameter: "pH",
          influencingFactors: ["Water quality changes"],
          recommendedActions: ["Monitor pH levels", "Consider water testing"],
          status: "normal"
        },
        {
          parameter: "temperature",
          influencingFactors: ["Environmental conditions"],
          recommendedActions: ["Monitor water temperature", "Provide shade if needed"],
          status: "normal"
        }
      ]
    };
  }

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
 * Check if API request should be rate limited (prioritized)
 * @param {string} componentId - The component requesting the API call
 */
const shouldRateLimit = (componentId = 'default') => {
  const now = Date.now();

  // Clean old timestamps outside the window
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Get component priority (lower number = higher priority)
  const componentPriority = COMPONENT_PRIORITIES[componentId] || COMPONENT_PRIORITIES.default;
  const isHighPriority = componentPriority <= 2; // Home and report components get priority

  // Allow high-priority components even when near limit
  const effectiveLimit = isHighPriority ? MAX_DAILY_REQUESTS : MAX_DAILY_REQUESTS - 2;

  // Check if we're over the effective limit for this component's priority
  if (requestTimestamps.length >= effectiveLimit) {
    const timeUntilReset = RATE_LIMIT_WINDOW - (now - requestTimestamps[0]);
    const hoursLeft = Math.ceil(timeUntilReset / (60 * 60 * 1000));
    const minutesLeft = Math.ceil(timeUntilReset / (60 * 1000));

    if (isHighPriority) {
      silentLog(`🟡 Approaching daily limit (${requestTimestamps.length}/${MAX_DAILY_REQUESTS}). High-priority component ${componentId} allowed.`);
      return false; // Allow high-priority components
    } else {
      silentLog(`🛑 Daily rate limit effective threshold reached (${requestTimestamps.length}/${effectiveLimit}) for ${componentId}. Next reset in ${hoursLeft} hours (${minutesLeft} minutes).`);
      return true; // Block low-priority components when near limit
    }
  }

  return false;
};

/**
 * Record a successful API request for rate limiting
 */
const recordRequest = () => {
  requestTimestamps.push(Date.now());
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

/**
 * Emergency functions for managing AI quota
 */

/**
 * Disable AI completely (emergency mode)
 */
export const disableAI = () => {
  aiCompletelyDisabled = true;
  silentLog("🚫 AI completely disabled for quota conservation");
};

/**
 * Re-enable AI after quota reset or billing upgrade
 */
export const enableAI = () => {
  aiCompletelyDisabled = false;
  silentLog("✅ AI re-enabled");
};

/**
 * Check if AI is currently disabled
 */
export const isAIDisabled = () => {
  return aiCompletelyDisabled;
};

/**
 * Get insight status for a component (used by InsightsContext)
 * @param {string} componentId - The component ID
 */
export const getInsightStatus = (componentId = 'default') => {
  // Return status based on current state
  if (aiCompletelyDisabled) {
    return 'ai-disabled';
  }

  if (isQuotaExceeded) {
    return 'quota-limited';
  }

  if (shouldRateLimit(componentId)) {
    return 'rate-limited';
  }

  return 'available';
};

/**
 * Get current rate limiting status
 */
export const getRateLimitStatus = () => {
  const now = Date.now();

  // Clean timestamps first
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  const timeUntilReset = requestTimestamps.length >= MAX_DAILY_REQUESTS
    ? RATE_LIMIT_WINDOW - (now - requestTimestamps[0])
    : 0;

  return {
    currentRequests: requestTimestamps.length,
    maxRequests: MAX_DAILY_REQUESTS,
    remaining: Math.max(0, MAX_DAILY_REQUESTS - requestTimestamps.length),
    hoursUntilReset: Math.ceil(timeUntilReset / (60 * 60 * 1000)),
    minutesUntilReset: Math.ceil(timeUntilReset / (60 * 1000)),
    aiDisabled: aiCompletelyDisabled,
    quotaExceeded: isQuotaExceeded,
    rateLimited: shouldRateLimit()
  };
};

/**
 * Reset daily request counters (for testing/debugging)
 */
export const resetDailyLimits = () => {
  if (!__DEV__) {
    silentError("Reset function only available in development mode");
    return false;
  }

  requestTimestamps = [];
  isQuotaExceeded = false;
  quotaResetTime = null;
  aiCompletelyDisabled = false;
  silentLog("🔄 Daily limits reset (dev mode only)");
  return true;
};

silentLog("Enhanced Gemini API initialized with 15-minute intervals and caching");
