import { GEMINI_API_KEY } from "@env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getWaterQualityThresholdsFromSettings, getWaterQualityThresholds } from '@constants/thresholds';

/**
 * Generate forecast-aware parameter suggestions based on trend data
 * @param {Object} forecastData - Forecasted parameter values
 * @param {Object} trends - Trend data for each parameter (rising/falling/stable)
 * @param {string} componentId - Component identifier for context
 */
const generateForecastParameterSuggestions = (forecastData, trends, componentId = 'default') => {
  const suggestions = [];
  const parameters = ['pH', 'Temperature', 'Salinity', 'Turbidity'];

  // Process each parameter
  parameters.forEach(param => {
    const predictedValue = forecastData?.[param];
    const trend = trends?.[param] || 'stable';

    if (predictedValue != null) {
      // Generate trend-specific influencing factors and recommendations
      const paramSuggestions = {
        parameter: param,
        status: trend === 'rising' ? 'warning' : trend === 'falling' ? 'warning' : 'normal',
        influencingFactors: [],
        recommendedActions: []
      };

      switch (param) {
        case 'pH':
          if (trend === 'rising') {
            paramSuggestions.influencingFactors = [
              "Recent changes in feeding patterns",
              "Fresh water additions raising pH",
              "High sunlight promoting photosynthesis"
            ];
            paramSuggestions.recommendedActions = [
              "Monitor pH levels more frequently",
              "Consider water changes if overshoot expected",
              "Adjust buffering if needed"
            ];
          } else if (trend === 'falling') {
            paramSuggestions.influencingFactors = [
              "Heavy rainfall reducing pH",
              "Increased fish metabolic activity",
              "Blocked photosynthetic activity"
            ];
            paramSuggestions.recommendedActions = [
              "Add baking soda gradually if needed",
              "Check water source pH stability",
              "Monitor for stress in fish"
            ];
          } else {
            paramSuggestions.influencingFactors = [
              "Stable feeding and maintenance routines",
              "Consistent water change schedule",
              "Balanced light exposure"
            ];
            paramSuggestions.recommendedActions = [
              "Continue regular pH testing twice weekly",
              "Maintain consistent buffering additions",
              "Note any environmental changes"
            ];
          }
          break;

        case 'Temperature':
          if (trend === 'rising') {
            paramSuggestions.influencingFactors = [
              "Increasing daytime temperatures",
              "Reduced shade coverage",
              "Shallow water absorbing more heat"
            ];
            paramSuggestions.recommendedActions = [
              "Add shade cloth over critical areas",
              "Increase water depth if possible",
              "Monitor water temperature hourly"
            ];
          } else if (trend === 'falling') {
            paramSuggestions.influencingFactors = [
              "Cooling evening temperatures",
              "Heavy cloud cover reducing sunlight",
              "Cold weather fronts approaching"
            ];
            paramSuggestions.recommendedActions = [
              "Consider heated water if needed",
              "Monitor fish for cold stress signs",
              "Check feeding rates in cooler conditions"
            ];
          } else {
            paramSuggestions.influencingFactors = [
              "Consistent weather patterns",
              "Stable shade arrangement",
              "Appropriate pond location"
            ];
            paramSuggestions.recommendedActions = [
              "Maintain shade coverage in afternoons",
              "Regular temperature monitoring",
              "Adjust feeding by weather conditions"
            ];
          }
          break;

        case 'Salinity':
          if (trend === 'rising') {
            paramSuggestions.influencingFactors = [
              "Evaporation concentrating salt levels",
              "High salt feeding for fish health",
              "Dry weather reducing water input"
            ];
            paramSuggestions.recommendedActions = [
              "Measure salt levels before adding more",
              "Add fresh water to dilute if needed",
              "Monitor for sudden salt changes"
            ];
          } else if (trend === 'falling') {
            paramSuggestions.influencingFactors = [
              "Heavy rainfall diluting salt levels",
              "Fresh water additions overpowering salt",
              "Wet weather increasing pond water volume"
            ];
            paramSuggestions.recommendedActions = [
              "Add salt gradually to maintain levels",
              "Test salinity after rain events",
              "Monitor fish adjustment to salinity changes"
            ];
          } else {
            paramSuggestions.influencingFactors = [
              "Balanced freshwater and salt inputs",
              "Consistent evaporation and rainfall",
              "Stable maintenance routines"
            ];
            paramSuggestions.recommendedActions = [
              "Regular salinity testing schedule",
              "Maintain consistent salt feeding",
              "Adjust for seasonal weather changes"
            ];
          }
          break;

        case 'Turbidity':
          if (trend === 'rising') {
            paramSuggestions.influencingFactors = [
              "Fish activity disturbing sediment",
              "Heavy feeding stirring up bottom mud",
              "Recent water additions"
            ];
            paramSuggestions.recommendedActions = [
              "Reduce feeding temporarily if excessive",
              "Add settling areas for water clarification",
              "Clean filters regularly"
            ];
          } else if (trend === 'falling') {
            paramSuggestions.influencingFactors = [
              "Heavy rainfall clearing sediment",
              "Reduced fish activity",
              "Effective filtration systems"
            ];
            paramSuggestions.recommendedActions = [
              "Monitor filter efficiency",
              "Regular pond bottom cleaning",
              "Adjust feeding patterns"
            ];
          } else {
            paramSuggestions.influencingFactors = [
              "Consistent fish population levels",
              "Stable feeding and maintenance",
              "Well-functioning filtration systems"
            ];
            paramSuggestions.recommendedActions = [
              "Regular filter cleaning schedule",
              "Monitor for any clarity changes",
              "Maintain consistent feeding routines"
            ];
          }
          break;
      }

      suggestions.push(paramSuggestions);
    }
  });

  return suggestions;
};

/**
 * Generate forecast-aware static fallback responses
 */
const generateForecastStaticFallback = (forecastData, trends) => {
  const suggestions = generateForecastParameterSuggestions(forecastData, trends, 'forecast-overall-insight');

  return {
    insights: {
      overallInsight: `Forecast indicates ${Object.keys(trends || {}).filter(key => trends[key] !== 'stable').length} parameters showing trends that require attention. Here are the predicted water quality patterns and recommendations.`,
      timestamp: new Date().toISOString(),
      source: "forecast-static-fallback"
    },
    suggestions: suggestions
  };
};

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
 * Analyze parameter status against thresholds (reusable function)
 */
const getParameterQualityAssessment = async (data, isReport = false) => {
  const params = ['pH', 'temperature', 'salinity', 'turbidity'];
  const thresholds = await getWaterQualityThresholdsFromSettings();

  const issues = [];
  const warnings = [];
  const approaching = [];

  params.forEach(param => {
    let value = null;

    if (isReport) {
      // Report mode: access data.parameters[param].average
      value = data.parameters?.[param]?.average;
    } else {
      // Real-time mode: could be either full sensor data (data[param]) or individual parameter data (data.parameter, data.value)
      if (data.parameter && data.value && data.parameter.toLowerCase() === param.toLowerCase()) {
        // Individual parameter data structure from ParameterCard
        value = data.value;
      } else {
        // Full sensor data structure
        value = data[param];
      }
    }

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

/**
 * Generate parameter-specific fallback insights for individual parameter cards
 * @param {string} parameterName - The name of the parameter (e.g., 'Turbidity')
 * @param {Object} sensorData - Parameter sensor data from ParameterCard
 */
const generateParameterFallbackInsight = async (parameterName, sensorData) => {
  const paramKey = parameterName.toLowerCase();
  const status = sensorData.status || 'normal';

  // Helper function to safely format sensor data value
  const formatValue = (value) => {
    if (value === undefined || value === null || value === 'N/A') return 'current value';

    // If it's already a string (like from averageValue.toFixed(2)), try to parse it
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toFixed(1);
      }
      return 'current value';
    }

    // If it's a number, format it
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(1);
    }

    return 'current value';
  };

  const formattedValue = formatValue(sensorData.value);

  // Get parameter-specific alert-centered insights based on status
  const getParameterInsight = (param, status, formattedValue) => {
    // Critical alerts - immediate action needed
    if (status === 'critical') {
      switch(param) {
        case 'ph':
          return {
            insight: `CRITICAL: pH is dangerously out of range at ${formattedValue}. Fish health is severely compromised with decreased oxygen carrying capacity and increased disease risk.`,
            suggestions: [
              "IMMEDIATELY add baking soda or buffer solution in 1 tsp increments and test every 30 minutes",
              "Stop all feeding and minimize fish stress while correcting pH",
              "Consider a 50% water change with properly buffered replacement water",
              "Monitor oxygen levels closely as low pH reduces oxygen availability"
            ]
          };
        case 'temperature':
          return {
            insight: `CRITICAL: Water temperature at ${formattedValue}°C is life-threatening for fish. This extreme temperature can cause stress, weakened immunity, and potential mortality.`,
            suggestions: [
              "IMMEDIATELY adjust aeration and provide emergency shade or heating as needed",
              "Gradually change temperature by no more than 2°C per hour if using heaters/chillers",
              "Stop feeding and minimize fish activity during temperature stabilization",
              "Test temperature every 30 minutes until it reaches safe ranges (26-30°C)"
            ]
          };
        case 'salinity':
          return {
            insight: `CRITICAL: Salinity level at ${formattedValue} ppt is causing severe osmotic stress to fish. Rapid salinity changes can damage gills and cause mortality.`,
            suggestions: [
              "IMMEDIATELY begin gradual salinity adjustment at 1 ppt per hour maximum",
              "Use proper salt mix designed for fish ponds when increasing salinity",
              "Stop feeding during salinity correction to reduce metabolic stress",
              "Monitor fish behavior closely - lethargy indicates correction pace is too fast"
            ]
          };
        case 'turbidity':
          return {
            insight: `CRITICAL: Turbidity at ${formattedValue} NTU indicates severe water cloudiness. Fish visibility is extremely compromised with potential gill damage from particulates.`,
            suggestions: [
              "IMMEDIATELY stop all feeding and reduce fish activity that stirs up sediment",
              "Clean filters thoroughly and add extra filtration capacity if available",
              "Add natural settling agents like alum (consult local extension service)",
              "Cover pond surface partially to reduce wind-driven turbulence"
            ]
          };
        default:
          return {
            insight: `CRITICAL: ${parameterName} at ${formattedValue} ${sensorData.unit || ''} is in dangerous territory. Immediate corrective action is essential to prevent fish health deterioration.`,
            suggestions: [
              "Take immediate steps to bring parameter back within safe operating ranges",
              "Stop feeding and minimize stress on fish during correction",
              "Monitor parameter closely - test every hour if possible",
              "Contact local aquaculture specialist for emergency guidance"
            ]
          };
      }
    }

    // Warning alerts - monitoring needed
    if (status === 'warning') {
      switch(param) {
        case 'ph':
          return {
            insight: `WARNING: pH at ${formattedValue} indicates approaching unsafe levels. While not immediately critical, continued trends could stress fish health and predispose them to disease.`,
            suggestions: [
              "Monitor pH levels twice daily and track trends over the next 48 hours",
              "Prepare baking soda or buffering agents for quick pH adjustment if needed",
              "Check and clean filters regularly as they can influence pH stability",
              "Consider adding buffer chemicals during water changes to maintain stability"
            ]
          };
        case 'temperature':
          return {
            insight: `WARNING: Temperature at ${formattedValue}°C is outside optimal ranges but not life-threatening. This can cause chronic stress and reduced growth rates over time.`,
            suggestions: [
              "Monitor temperature hourly during heat/cold events and daily otherwise",
              "Adjust shade coverage or consider pond location changes for better temperature control",
              "Test temperature morning and evening to understand daily fluctuations",
              "Consider supplementary aeration during warmer periods to maintain oxygen levels"
            ]
          };
        case 'salinity':
          return {
            insight: `WARNING: Salinity at ${formattedValue} ppt is trending away from optimal. Gradual changes can cause chronic stress even when not immediately life-threatening.`,
            suggestions: [
              "Monitor salinity levels twice daily and record measurements",
              "Make salinity adjustments slowly over several days (no more than 1 ppt per day)",
              "Check evaporation rates and rainfall patterns that influence salinity",
              "Use consistent salt feeding practices and record quantities added"
            ]
          };
        case 'turbidity':
          return {
            insight: `WARNING: Turbidity at ${formattedValue} NTU shows increasing cloudiness. While not critical yet, elevated levels affect fish feeding behavior and growth.`,
            suggestions: [
              "Increase filter cleaning frequency and monitor filter performance",
              "Reduce feeding amounts temporarily to decrease waste input",
              "Check for pond bottom sediment disturbance from fish activity",
              "Consider adding beneficial bacteria products to improve natural filtration"
            ]
          };
        default:
          return {
            insight: `WARNING: ${parameterName} at ${formattedValue} ${sensorData.unit || ''} is approaching problem levels. Close monitoring is needed to prevent deterioration.`,
            suggestions: [
              "Double monitoring frequency and track parameter trends carefully",
              "Prepare corrective supplies and have them ready for quick action",
              "Review maintenance practices that might be affecting this parameter",
              "Contact aquaculture extension services for specific recommendations"
            ]
          };
      }
    }

    // Normal status - maintenance and optimization
    switch(param) {
      case 'ph':
        return {
          insight: `GOOD: pH at ${formattedValue} is within acceptable ranges. This stable pH level supports healthy fish immune systems and efficient oxygen utilization.`,
          suggestions: [
            "Continue regular pH testing 2-3 times per week as part of routine monitoring",
            "Maintain consistent buffering practices during water changes",
            "Monitor for gradual trends that might indicate system imbalances",
            "Document pH stability as part of overall pond health records"
          ]
        };
      case 'temperature':
        return {
          insight: `GOOD: Water temperature at ${formattedValue}°C is in the optimal range for fish health and growth. This supports efficient metabolism and immune function.`,
          suggestions: [
            "Continue daily temperature monitoring in morning and afternoon",
            "Maintain current shade and aeration systems in good working order",
            "Track seasonal temperature patterns to anticipate needed adjustments",
            "Consider supplemental heating/cooling only if environmental conditions become extreme"
          ]
        };
      case 'salinity':
        return {
          insight: `GOOD: Salinity at ${formattedValue} ppt is appropriate for the fish species. This level supports proper osmotic balance and disease resistance.`,
          suggestions: [
            "Continue regular salinity testing and consistent salt feeding practices",
            "Monitor weather patterns that might affect evaporation/dilution rates",
            "Record salinity measurements to track patterns and system consistency",
            "Adjust salt quantities based on rainfall events as needed"
          ]
        };
      case 'turbidity':
        return {
          insight: `GOOD: Turbidity at ${formattedValue} NTU indicates clear water conditions. Fish have good visibility and there are minimal particulates affecting gill health.`,
          suggestions: [
            "Maintain current filter cleaning schedule and good filtration practices",
            "Continue appropriate feeding levels without overfeeding",
            "Monitor for any changes in weather or pond conditions that could increase turbidity",
            "Keep pond bottom management practices consistent (no excessive cleaning that stirs sediment)"
          ]
        };
      default:
        return {
          insight: `GOOD: ${parameterName} at ${formattedValue} ${sensorData.unit || ''} is within acceptable operating parameters. Current levels support healthy fish conditions.`,
          suggestions: [
            "Maintain regular monitoring schedule for this parameter",
            "Document current values as part of baseline pond health records",
            "Continue standard maintenance procedures that support parameter stability",
            "Be alert for gradual trends that might require preventive adjustments"
          ]
        };
    }
  };

  const insightData = getParameterInsight(paramKey, status, formattedValue);

  return {
    overallInsight: insightData.insight,
    suggestions: insightData.suggestions.map(suggestion => ({
      parameter: parameterName,
      influencingFactors: [`${parameterName} water quality parameter`],
      recommendedActions: [suggestion],
      status: status
    }))
  };
};

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
  const isReport = componentId === "report-overall-insight";
  const isParameterInsight = componentId.endsWith('-insight') && !isReport;

  // Handle parameter-specific insights (like "turbidity-insight")
  if (isParameterInsight) {
    const paramName = componentId.replace('-insight', '').toLowerCase();
    const displayName = paramName.charAt(0).toUpperCase() + paramName.slice(1);

    // Generate parameter-specific fallback insight
    const parameterFallback = await generateParameterFallbackInsight(displayName, sensorData);

    return {
      insights: {
        overallInsight: parameterFallback.overallInsight || `${displayName} appears to be stable at current levels. Continue regular monitoring.`,
        timestamp: new Date().toISOString(),
        source: "parameter-fallback"
      },
      suggestions: parameterFallback.suggestions || []
    };
  }

  // Prioritize alert levels and weather consideration for fallback responses
  const getAlertLevelBasedAssessment = () => {
    const criticalParams = [];
    const warningParams = [];
    const normalParams = [];

    // Check alert levels for each parameter (prioritize these)
    const params = ['pH', 'temperature', 'salinity', 'turbidity'];
    params.forEach(param => {
      const alertLevel = sensorData[`${param}AlertLevel`] || 'normal';
      if (alertLevel === 'critical') criticalParams.push(param);
      else if (alertLevel === 'warning') warningParams.push(param);
      else normalParams.push(param);
    });

    return { criticalParams, warningParams, normalParams };
  };

  const { criticalParams, warningParams, normalParams } = getAlertLevelBasedAssessment();
  const isRaining = sensorData.isRaining && sensorData.isRaining > 0;
  const rainMessage = isRaining ? "with recent rain, be extra careful with" : "";

  // Generate personalized response based on alert level assessment
  let overallInsight;
  let suggestions = [];

  if (isReport) {
    // Report-specific fallback response
    const wqiScore = sensorData.wqi?.overall || 0;
    const overallStatus = sensorData.overallStatus || 'unknown';

    if (wqiScore >= 90) {
      overallInsight = `Great job maintaining your pond, ${user}! Your WQI score of ${wqiScore} shows excellent water quality overall. All parameter averages stayed within healthy ranges, indicating consistent pond management.`;
    } else if (wqiScore >= 70) {
      overallInsight = `Good work overall, ${user}. Your WQI score of ${wqiScore} shows good water quality, though there may be some areas to watch closely over the coming weeks.`;
    } else if (wqiScore >= 50) {
      overallInsight = `Hey ${user}, your WQI score of ${wqiScore} indicates fair (acceptable) water quality. While not concerning, monitor your parameters to ensure they don't decline further.`;
    } else if (wqiScore >= 25) {
      overallInsight = `Your WQI score of ${wqiScore} indicates poor water quality concerns that need attention, ${user}. To improve water quality and raise your WQI score, focus on the parameter averages that are contributing most to this score.`;
    } else {
      overallInsight = `Oh no, ${user}! Your WQI score of ${wqiScore} indicates very poor water quality with serious concerns. Immediate action is required to address these water quality issues and improve your WQI score.`;
    }

    // Add WQI improvement suggestions for poor scores
    if (wqiScore >= 25 && wqiScore < 50) {
      // Poor water quality - focus on solutions to improve WQI
      suggestions.unshift({
        parameter: "WQI Improvement",
        influencingFactors: [
          "Poor overall water quality requiring comprehensive improvement",
          "Multiple parameters contributing to low WQI score",
          "Need systematic approach to water quality management"
        ],
        recommendedActions: [
          "Perform a 30% water change to reduce overall pollution levels and improve all parameters",
          "Clean or replace filters to improve water clarity and reduce turbidity",
          "Test and adjust pH to optimal range (6.5-8.5) using baking soda for low pH or buffers for high pH",
          "Monitor and adjust feeding practices to reduce waste buildup affecting water quality",
          "Ensure proper aeration to maintain oxygen levels and prevent anaerobic conditions",
          "Check and clean pond bottom to remove accumulated debris and organic matter",
          "Establish regular water testing schedule - test pH, ammonia, nitrite daily for 2 weeks",
          "Consider beneficial bacteria supplements to help break down organic waste",
          "Monitor temperature daily and provide shade or heating as needed for optimal range (26-30°C)"
        ],
        status: "critical"
      });
    } else if (wqiScore < 25) {
      // Very poor water quality - urgent solutions needed
      suggestions.unshift({
        parameter: "Urgent WQI Recovery",
        influencingFactors: [
          "Severely degraded water quality requiring immediate emergency measures",
          "Multiple critical parameters endangering fish health",
          "Risk of fish mortality if not addressed immediately"
        ],
        recommendedActions: [
          "URGENT: Perform emergency 50% water change immediately to save fish lives",
          "Stop all feeding until water quality improves to prevent additional pollution",
          "Provide extra aeration with air stones or emergency aerators immediately",
          "Add emergency water conditioners or treatments if available",
          "Isolate healthy fish if possible while treating water problems",
          "Clean/replace all filters and test water chemistry every 4-6 hours",
          "Contact aquaculture specialists or local extension service for emergency assistance",
          "Monitor fish behavior closely - lethargy indicates critical water quality",
          "Prepare to harvest fish early if severe problems persist beyond 24 hours"
        ],
        status: "critical"
      });
    }

    // Add parameter-specific insights based on averages
    if (sensorData.parameters) {
      const paramSuggestions = Object.entries(sensorData.parameters).slice(0, 3); // Limit to 3 for brevity

      paramSuggestions.forEach(([param, data]) => {
        if (data?.average != null) {
          suggestions.push({
            parameter: param,
            influencingFactors: [`${param} trends over time period`],
            recommendedActions: [`Maintain ${param} around ${data.average.toFixed(1)} average`, `Monitor for significant deviations`],
            status: "normal"
          });
        }
      });
    }
  } else {
    // Regular real-time insights fallback based on alert levels
    if (criticalParams.length >= 2) {
      // Multiple critical issues
      overallInsight = `Oh no, ${user}! There are several critical water quality concerns that need immediate attention. Your fish health is at serious risk - please address these issues right away${isRaining ? ', especially with recent rain' : ''}.`;
    } else if (criticalParams.length === 1) {
      // Single critical issue
      overallInsight = `Oh no, ${user}! Your ${criticalParams[0]} needs immediate attention as it's in critical condition. ${isRaining ? `With recent rain, this becomes even more urgent.` : 'Please address this right away to protect your fish.'}`;
    } else if (warningParams.length > 0) {
      // Warning issues
      overallInsight = `Hey ${user}, your water quality needs attention. ${warningParams.length === 1 ? `Your ${warningParams[0]} requires close monitoring` : `Several parameters need watching closely`} ${isRaining ? 'especially with recent rain' : ''}.`;
    } else {
      // All normal
      overallInsight = `Excellent news, ${user}! Your pond water quality looks perfect${isRaining ? ', even with recent rain' : ''}. All parameters are within good ranges - keep up the great work managing your fish farm!`;
    }

    // Generate suggestions based on alert levels
    const allParamsToAddress = [...criticalParams, ...warningParams];

    if (allParamsToAddress.includes('pH')) {
      const isCritical = criticalParams.includes('pH');
      suggestions.push({
        parameter: "pH",
        influencingFactors: [
          "Fish waste making water more acidic",
          "Too much fish food leftover",
          ...(isRaining ? ["Heavy rainfall washing in acids from soil"] : [])
        ],
        recommendedActions: isCritical ? [
          "Add baking soda (1 tsp per 10 gallons) daily until pH rises",
          "Do a 20% water change tomorrow",
          "Reduce fish food by half for 3 days"
        ] : [
          "Add baking soda (½ tsp per 10 gallons) daily for 3 days",
          "Test pH every other day to check progress",
          ...(isRaining ? ["Monitor pH more frequently after rain"] : [])
        ],
        status: isCritical ? "critical" : "warning"
      });
    }

    if (allParamsToAddress.includes('temperature')) {
      const isCritical = criticalParams.includes('temperature');
      suggestions.push({
        parameter: "temperature",
        influencingFactors: [
          "Hot sun during afternoon",
          "Using shallow water in pond",
          "No shade over the pond",
          ...(isRaining ? ["Cooler water from recent rain"] : [])
        ],
        recommendedActions: isCritical ? [
          "Install shade cloth over pond immediately",
          "Add pond depth with new water if possible",
          "Provide extra aeration today"
        ] : [
          "Add more shade cloth to pond",
          "Check water depth - aim for 3-4 feet",
          "Monitor temperature twice daily",
          ...(isRaining ? ["Be prepared for temperature fluctuations after rain"] : [])
        ],
        status: isCritical ? "critical" : "warning"
      });
    }

    if (allParamsToAddress.includes('salinity')) {
      const isCritical = criticalParams.includes('salinity');
      suggestions.push({
        parameter: "salinity",
        influencingFactors: [
          "Using too much salt for fish health",
          "Not adding salt regularly",
          ...(isRaining ? ["Heavy rain diluting the salt level"] : [])
        ],
        recommendedActions: isCritical ? [
          "Reduce salt feeding by half for a few days",
          "Add 2 tablespoons of salt per 10 gallons daily",
          "Gradually add salt back over 3-4 days"
        ] : isRaining ? [
          "Add 2 tablespoons salt per 10 gallons of pond water",
          "Mix thoroughly and test in 24 hours",
          "Add salt gradually over several days"
        ] : [
          "Maintain regular salt feeding schedule",
          "Test salinity levels regularly",
          "Add salt incrementally if needed"
        ],
        status: isCritical ? "critical" : "warning"
      });
    }

    if (allParamsToAddress.includes('turbidity')) {
      const isCritical = criticalParams.includes('turbidity');
      suggestions.push({
        parameter: "turbidity",
        influencingFactors: [
          "Fish stirring up bottom mud",
          "Too many fish in small pond",
          "Filter not clean or not strong enough",
          ...(isRaining ? ["Recent rain increasing water cloudiness"] : [])
        ],
        recommendedActions: isCritical ? [
          "Clean filter thoroughly right now",
          "Reduce feeding by half for 2 days",
          "Add a settling pond section if possible"
        ] : [
          "Don't overfeed fish to reduce their activity",
          "Clean filter daily and make sure water flows through well",
          ...(isRaining ? ["Clean filters more frequently after rain", "Monitor for increased sediment"] : [])
        ],
        status: isCritical ? "critical" : "warning"
      });
    }

    // Add maintenance for normal parameters or if no issues
    if (suggestions.length < 2) {
      if (!suggestions.some(s => s.parameter === 'pH')) {
        suggestions.push({
          parameter: "pH",
          influencingFactors: [
            "Balanced fish food",
            "Proper pond maintenance",
            ...(isRaining ? ["pH stability during rain events"] : [])
          ],
          recommendedActions: [
            "Maintain current feeding schedule",
            "Test water weekly to confirm stability",
            ...(isRaining ? ["Monitor pH for 2-3 days after rain"] : [])
          ],
          status: "normal"
        });
      }

      if (!suggestions.some(s => s.parameter === 'maintenance') && suggestions.length === 1) {
        suggestions.push({
          parameter: "maintenance",
          influencingFactors: [
            "Regular pond care",
            ...(isRaining ? ["Routine maintenance during rain events"] : [])
          ],
          recommendedActions: [
            "Clean filters weekly",
            "Test all water parameters every 3 days",
            "Feed fish according to stocking density"
          ],
          status: "normal"
        });
      }
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
const normalizeSensorData = (sensorData, componentId) => {
  const isReport = componentId === "report-overall-insight";

  if (isReport) {
    // For reports, normalize averages from parameters and WQI value
    const normalized = { ...sensorData };

    if (normalized.wqi?.value != null && !isNaN(normalized.wqi.value)) {
      normalized.wqi.value = Math.round(normalized.wqi.value);
    }

    if (normalized.parameters) {
      Object.keys(normalized.parameters).forEach(param => {
        const data = normalized.parameters[param];
        if (data?.average != null && !isNaN(data.average)) {
          const precision = param === 'pH' ? 0.1 : param === 'temperature' ? 1 : 0.5;
          normalized.parameters[param] = {
            ...data,
            average: Math.round(data.average / precision) * precision
          };
        }
      });
    }

    return normalized;
  } else {
    // Original logic for real-time insights
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
  }
};

/**
 * Create a simple hash of the normalized sensor data for cache key
 */
const createDataHash = (sensorData, componentId = 'default') => {
  const normalizedData = normalizeSensorData(sensorData, componentId);
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
    const modelName = componentId === "forecast-overall-insight"
      ? "gemini-2.5-flash-lite" // Keep forecast on lite model due to data complexity
      : componentId === "home-overall-insight"
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

    // Use different prompt structure for reports vs real-time insights
    const isReport = componentId === "report-overall-insight";

    let prompt;
    if (isReport) {
      // Analyze current water quality status for reports (same as real-time insights)
      const { issues: reportIssues, warnings: reportWarnings } = await getParameterQualityAssessment(sensorData, isReport); // Pass correct report flag

      // Determine overall water quality status for current period
      let currentReportStatus = 'normal';
      if (reportIssues.length >= 2) currentReportStatus = 'critical';
      else if (reportIssues.length > 0) currentReportStatus = 'warning';
      else if (reportWarnings.length > 0) currentReportStatus = 'warning';

      // Determine greeting style based on current water quality status
      const reportGreetingStyle = getGreetingStyle(currentReportStatus, userNickname);

      // Special prompt for report insights that analyzes WQI and parameter averages PLUS current water quality status
      prompt = `
      Based on this water quality REPORT data for FISH FARMERS, provide insights about overall water quality trends and the WQI score, while continuously checking the current water quality status.
      The report data is: ${JSON.stringify(sensorData)}

      REPORT ANALYSIS CONTEXT:
      - This is a WATER QUALITY REPORT showing averaged data over a time period
      - WQI (Water Quality Index): ${sensorData.wqi?.overall} (status: ${sensorData.wqi?.status})
      - WQI Range: Lower scores (0-30) are excellent, higher scores (70-100+) indicate problems
      - Parameter averages are calculated across the entire reporting period
      - Overall status: ${sensorData.overallStatus}
      - Fish pond type: ${fishpondType}

      CURRENT WATER QUALITY ASSESSMENT:
      - Current water quality status: ${currentReportStatus}
      - Issues identified: ${reportIssues.length > 0 ? reportIssues.join(', ') : 'None'}
      - Parameters approaching thresholds: ${reportWarnings.length > 0 ? reportWarnings.join(', ') : 'None'}
      - Greeting style: ${reportGreetingStyle.tone} - START with: "${reportGreetingStyle.opening}"

      USER PERSONALIZATION:
      - User's nickname: ${userNickname || 'not set'}
      - Current quality status determines tone: ${currentReportStatus}

      ANALYSIS REQUIREMENTS:
      - Explain why each parameter is in its current alert level (normal/warning/critical)
      - Analyze parameter alert levels using causes: critical from extreme readings, warning from approaching threshold, normal within safe range
      - Explain trends using percentage changes: why parameters are rising/falling/stable and what causes these patterns
      - Check current water quality status FIRST (critical/warning/normal) and base insight tone on this
      - Explain what the WQI score means in practical terms for fish farmers
      - Analyze how parameter averages contribute to overall water quality
      - Interpret trends and consistency in parameter values over the time period
      - Identify which parameters most impact the WQI score AND current issues
      - Address both historical trends (report period) AND current status priorities

      ALERT LEVEL EXPLANATIONS - WHY PARAMETERS ARE IN EACH STATUS:
      - CRITICAL alerts: Extreme values that immediately endanger fish health (too high/low for survival)
      - WARNING alerts: Values approaching dangerous levels that need monitoring
      - NORMAL alerts: Values within safe ranges that support healthy fish conditions
      - Include specific causes for each alert level based on parameter type and current conditions

      TREND EXPLANATIONS - WHY PERCENTAGE CHANGES OCCUR:
      - Use exact percentage changes from parameter trends (rising/falling/stable)
      - Explain what factors cause each trend direction and magnitude
      - Connect percentage changes to farming practices and environmental conditions

      RESPONSE STYLE REQUIREMENTS:
      - START your overall insight with: "${reportGreetingStyle.opening}"
      - Address the user by their nickname "${userNickname || 'fish farmer'}" when appropriate
      - Base conversational tone on CURRENT WATER QUALITY STATUS: ${currentReportStatus}
      - Focus on OVERALL TRENDS while addressing current status priorities
      - Use simple farmer language - avoid technical terms
      - Explain WQI impact: "Your WQI of ${sensorData.wqi?.overall} indicates [good/poor] water quality"
      - For current issues: ${reportIssues.length > 0 ? 'URGENT - address ' + reportIssues.map(i => i.split(' ')[0]).join(' and ') + ' immediately' : 'Monitor ongoing trends'}
      - For approaching thresholds: ${reportWarnings.length > 0 ? 'Watch ' + reportWarnings.map(w => w.split(' ')[0]).join(' and ') + ' closely' : ''}

      EXAMPLES OF GOOD REPORT INSIGHTS WITH ALERT & TREND EXPLANATIONS:
      ✅ CRITICAL: "Oh no, David! Your WQI of 85 shows serious problems with turbidity at critical levels because cloudy water harms gills. Turbidity fell 15.2% likely from recent heavy rain settling particles, but values are still dangerous for fish health."
      ✅ WARNING: "Hey Maria, your salinity is approaching warning levels at 2.3 ppt because it's trending up 8.7% from evaporation concentrating salts. Watch closely as rising salinity can stress fish before it becomes critical."
      ✅ NORMAL: "Excellent news, John! Your pH is normal because it stayed stable within safe ranges, only varying 2.1% which indicates good buffer capacity. This balanced pH supports healthy fish metabolism throughout the period."

      Please return a JSON object with this structure:
      {
        "insights": {
          "overallInsight": "Conversational analysis that starts with appropriate greeting based on current water quality status, explaining the WQI score and parameter averages while addressing current issues.",
          "timestamp": "${new Date().toISOString()}",
          "source": "gemini-ai"
        },
        "suggestions": [
          {
            "parameter": "pH",
            "influencingFactors": ["Average stability over time period", "Current threshold status"],
            "recommendedActions": ["Monitor average trends", "Address current issues immediately"],
            "status": "${reportIssues.some(i => i.includes('ph')) ? 'critical' : reportWarnings.some(w => w.includes('ph')) ? 'warning' : 'normal'}"
          },
          {
            "parameter": "temperature",
            "influencingFactors": ["Temperature consistency and trends", "Current temperature status"],
            "recommendedActions": ["Shade management", "Address any current overheating"],
            "status": "${reportIssues.some(i => i.includes('temperature')) ? 'critical' : reportWarnings.some(w => w.includes('temperature')) ? 'warning' : 'normal'}"
          }
        ]
      }
      `;
    } else {
      // Original prompt for real-time insights with alert level priority and weather consideration
      prompt = `
      Based on the following pond/tank water quality sensor data, provide analysis and simple recommendations for FISH FARMERS.
      The data is: ${JSON.stringify(sensorData)}
      Water quality thresholds for ${fishpondType} ponds: ${JSON.stringify(actualThresholds)}

      PRIORITY ANALYSIS REQUIREMENTS:
      - PRIORITIZE EACH PARAMETER'S ALERT LEVEL FIRST (pHAlertLevel, temperatureAlertLevel, salinityAlertLevel, turbidityAlertLevel)
      - Alert levels indicate current status: 'critical' = immediate action needed, 'warning' = monitor closely, 'normal' = good condition
      - Weather condition (isRaining): if raining (value > 0), adjust recommendations for rainfall effects on water quality
      - Focus urgent recommendations on parameters with 'critical' alert levels, then 'warning' levels
      - Weather-aware adjustments: rain affects pH (lowers it), turbidity (increases), salinity (dilutes), temperature (cools water)

      USER PERSONALIZATION:
      - User's nickname: ${userNickname || 'not set'}
      - Fish pond type: ${fishpondType}
      - Overall quality status: ${qualityStatus}
      - Greeting style: ${greetingStyle.tone}
      - Actual thresholds: ${JSON.stringify(actualThresholds)}

      ANALYSIS REQUIREMENTS:
      - Start with parameters that have 'critical' or 'warning' alert levels
      - Consider weather impact on each parameter's current alert level
      - Explain how rain affects each parameter if isRaining > 0
      - Provide weather-appropriate action adjustments

      RESPONSE STYLE REQUIREMENTS:
      - START your overall insight with: "${greetingStyle.opening}"
      - Address the user by their nickname "${userNickname || 'fish farmer'}" when appropriate
      - Use expressive greetings based on the quality status (examples: ${greetingStyle.examples.join(", ")})
      - Make the tone conversational and emotive, not clinical
      - PRIORITIZE critical issues first, then warnings, then provide maintenance advice for normal parameters

      LANGUAGE REQUIREMENTS:
      - Use extremely simple, everyday language that a fish farmer with no scientific training can understand
      - Avoid technical jargon - use terms like "baking soda", "clean filters", "change some water", "add salt", etc.
      - Make each recommendation a clear, actionable step that farmers can do TODAY
      - When mentioning alert levels, explain what they mean: "your pH needs immediate attention" (critical) or "watch your pH closely" (warning)
      - If raining, mention: "with recent rain, be extra careful with..." followed by parameter-specific advice

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
            "status": "${sensorData.pHAlertLevel || 'normal'}"
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
            "status": "${sensorData.temperatureAlertLevel || 'normal'}"
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
            "status": "${sensorData.salinityAlertLevel || 'normal'}"
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
            "status": "${sensorData.turbidityAlertLevel || 'normal'}"
          }
        ]
      }
      `;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
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

    // Use same alert level logic as static fallback
    return await generateStaticFallbackResponse(sensorData, componentId);
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

  const dataHash = createDataHash(sensorData, componentId);
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
  const dataHash = createDataHash(sensorData, componentId);
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

/**
 * Generate insights specifically for forecast data with trend analysis
 * @param {Object} forecastData - The forecasted parameter values
 * @param {Object} trends - Trend data for each parameter (rising/falling/stable)
 */
export const generateForecastInsight = async (forecastData, trends) => {
  try {
    // Validate input parameters
    if (!forecastData || typeof forecastData !== 'object') {
      return {
        insights: {
          overallInsight: "No forecast data available for analysis.",
          timestamp: new Date().toISOString(),
          source: "error"
        },
        suggestions: []
      };
    }

    // Validate trends parameter
    const validTrends = trends && typeof trends === 'object' ? trends : {};

    const componentId = "forecast-overall-insight";

// TEMPORARY: Clear rate limit counters to unblock forecast insights during development
// This allows forecast AI to work without affecting other insights
if (__DEV__) {
  console.log("🔄 Clearing rate limit counters to enable forecast insights");
  requestTimestamps = []; // Clear the request tracking
}

    // Emergency AI disable check
    if (aiCompletelyDisabled) {
      silentLog("🚫 AI completely disabled - using forecast static fallback");
      return generateForecastStaticFallback(forecastData, validTrends);
    }

    // Safely create data hash without spreading undefined trends
    const dataForHash = { ...forecastData, ...validTrends };
    const dataHash = createDataHash(dataForHash, componentId);
    const cachedInsight = await getCachedInsight(componentId, dataHash);

    if (cachedInsight && !shouldFetchNewData(componentId)) {
      silentLog(`⏰ Using cached forecast insight`);
      return cachedInsight;
    }

    // Generate new forecast insights
    const forecastSuggestions = generateForecastParameterSuggestions(forecastData, validTrends, componentId);

    // Create AI prompt for forecast insights
    const prompt = `
    Analyze these water quality FORECAST predictions and provide insights specifically for FISH FARMERS about what these trends mean for their pond management.

    FORECAST DATA: ${JSON.stringify(forecastData)}
    TREND ANALYSIS: ${JSON.stringify(trends)}

    CRITICAL TREND FOCUS REQUIREMENTS:
    - For EACH PARAMETER, focus ONLY on its specific current trend (rising/falling/stable)
    - If pH is rising, ONLY explain what causes pH increases and actions to prevent pH problems
    - If temperature is falling, ONLY explain what causes temperature decreases and actions to prevent cold stress
    - If any parameter is stable, ONLY explain what maintains stability and actions to keep it balanced
    - DO NOT mix trends - each parameter insight must be trend-specific

    FORECAST ANALYSIS REQUIREMENTS:
    - Explain the specific factors that are driving each parameter's current trend
    - Describe the immediate consequences if the trend continues unchecked
    - Provide targeted actions to either encourage (if stable/wanted) or counteract (if rising/falling unwanted) the trend
    - Suggest preventive measures appropriate for each parameter's specific trend

    RESPONSE STYLE REQUIREMENTS:
    - Focus on PREVENTIVE FORECASTING rather than current status
    - Use simple farmer language that fish farmers understand
    - For each parameter, explain: "WHAT FACTORS cause this [rising/falling/stable] trend, WHAT PROBLEMS it creates, WHAT ACTIONS to take"
    - Provide practical preparation steps specific to each trend scenario

    EXAMPLES OF TREND-FOCUSED FORECAST INSIGHTS:
    ✅ pH RISING: "Your pH is going up because fresh water additions raise it and plants use up sour gas. If it keeps rising, fish get stressed and can't breathe right. Check pH daily and have baking soda ready if it gets too high..."
    ✅ TEMPERATURE FALLING: "Water temperature is dropping from cooling nights and no sun. If it keeps getting colder, fish metabolism slows and they eat less. Watch fish movement and prepare heaters if needed..."
    ✅ TURBIDITY STABLE: "Mud levels staying steady - fish activity and filter work balanced. Keep feeding amounts the same and clean filter regularly to maintain this balance..."

    The parameter suggestions are already generated and provided below. Use these specific suggestions as context and expand into an overall predictive insight, but ENSURE each parameter response focuses ONLY on its specific trend.

    GENERATED SUGGESTIONS: ${JSON.stringify(forecastSuggestions)}

    Please return a JSON object with this structure (expand the overallInsight to be predictive and actionable):
    {
      "insights": {
        "overallInsight": "Conversational analysis of forecasted water quality trends, explaining what the predictions mean for proactive pond management and fish health preparation. For each parameter, focus on what causes its current specific trend and appropriate actions.",
        "timestamp": "${new Date().toISOString()}",
        "source": "gemini-ai-forecast"
      },
      "suggestions": ${JSON.stringify(forecastSuggestions)}
    }
    `;

    // Generate AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(cleanedText);

      // Cache the new forecast insight
      const insight = {
        insights: {
          overallInsight: parsedResponse.insights?.overallInsight || "Forecast analysis completed successfully.",
          timestamp: parsedResponse.insights?.timestamp || new Date().toISOString(),
          source: parsedResponse.insights?.source || "gemini-ai-forecast"
        },
        suggestions: forecastSuggestions
      };

      await cacheInsight(componentId, dataHash, insight);
      updateComponentFetchTime(componentId);

      return insight;
    } catch (jsonError) {
      silentError("Error parsing forecast AI response:", jsonError);
      throw new Error("Failed to parse forecast AI response");
    }

  } catch (error) {
    silentError("Error generating forecast insights:", error);
    return generateForecastStaticFallback(forecastData, trends);
  }
};

silentLog("Enhanced Gemini API initialized with 15-minute intervals and caching");
