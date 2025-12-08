import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { getWaterQualityThresholdsFromSettings } from "@constants/thresholds";

const computeAlertLevels = async (data) => {
  if (!data) return data;

  const params = ['pH', 'temperature', 'salinity', 'turbidity'];
  const enhancedData = { ...data };

  try {
    const thresholds = await getWaterQualityThresholdsFromSettings();

    params.forEach(param => {
      const value = data[param];
      if (value !== null && value !== undefined && !isNaN(value)) {
        const threshold = thresholds[param];
        if (threshold) {
          const numValue = parseFloat(value);
          let alertLevel = 'normal';

          // Check critical thresholds first
          if (threshold.critical) {
            if (threshold.critical.min && numValue < threshold.critical.min) {
              alertLevel = 'critical';
            } else if (threshold.critical.max && numValue > threshold.critical.max) {
              alertLevel = 'critical';
            }
          }

          // If not critical, check normal thresholds
          if (alertLevel === 'normal') {
            if (threshold.min && numValue < threshold.min) {
              alertLevel = 'warning';
            } else if (threshold.max && numValue > threshold.max) {
              alertLevel = 'warning';
            } else if (
              (threshold.min && numValue <= threshold.min + 0.3) ||
              (threshold.max && numValue >= threshold.max - 0.5)
            ) {
              alertLevel = 'warning'; // Approaching limits
            }
          }

          enhancedData[`${param}AlertLevel`] = alertLevel;
        } else {
          enhancedData[`${param}AlertLevel`] = 'normal';
        }
      } else {
        enhancedData[`${param}AlertLevel`] = 'unknown';
      }
    });
  } catch (error) {
    console.warn("Error computing alert levels:", error);
    // Set all to normal if thresholds can't be loaded
    params.forEach(param => {
      enhancedData[`${param}AlertLevel`] = 'normal';
    });
  }

  return enhancedData;
};

/**
 * Get user nickname from settings
 */
const getUserNickname = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem("pureflowSettings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      return parsedSettings.nickname || "Alex"; // Default to Alex if no nickname
    }
  } catch (error) {
    console.warn("Error loading user nickname:", error);
  }
  return "Alex"; // Fallback default
};

/**
 * Generate intelligent fallback insights based on alert levels
 * Only generates recommendations for warning/critical parameters
 */
const generateIntelligentFallbackResponse = async (data) => {
  try {
    console.log("🔄 Generating intelligent fallback with data:", data ? "data present" : "no data");

    // Safely get user's nickname from settings
    const userName = await getUserNickname();
    console.log("🔄 Got username:", userName);

    const params = ['pH', 'temperature', 'salinity', 'turbidity'];
    const suggestions = [];

    // Safely check if it's raining (avoid property access errors)
    let isRaining = false;
    try {
      isRaining = data && data.weather && data.weather.raining;
    } catch (weatherError) {
      console.warn("⚠️ Could not check weather data:", weatherError);
      isRaining = false;
    }
    console.log("🔄 Is raining:", isRaining);

    const criticalIssues = [];
    const warningIssues = [];

    // Analyze each parameter for alerts safely
    params.forEach(param => {
      try {
        const alertLevel = data && data[`${param}AlertLevel`];
        const value = data && data[param];

        console.log(`🔄 ${param}: level=${alertLevel}, value=${value}`);

        if (alertLevel === 'critical') {
          criticalIssues.push(param);
          suggestions.push({
            parameter: param,
            status: 'critical',
            influencingFactors: isRaining ? ['Recent rainfall washing in debris'] : ['Unstable water quality'],
            recommendedActions: getParameterRecommendations(param, alertLevel, value, isRaining)
          });
        } else if (alertLevel === 'warning') {
          warningIssues.push(param);
          suggestions.push({
            parameter: param,
            status: 'warning',
            influencingFactors: isRaining ? ['Weather affecting water quality'] : ['Parameter approaching boundaries'],
            recommendedActions: getParameterRecommendations(param, alertLevel, value, isRaining)
          });
        }
      } catch (paramError) {
        console.warn(`⚠️ Error processing parameter ${param}:`, paramError);
      }
    });

    // Generate overall insight message
    let overallInsight = '';

    if (criticalIssues.length > 0) {
      const criticalText = criticalIssues.length === 1
        ? `${criticalIssues[0]} needs immediate attention`
        : `${criticalIssues.join(' and ')} are critical`;
      overallInsight = `Hey ${userName}, your water quality needs urgent attention. Your ${criticalText}. ${isRaining ? 'Recent rain may be impacting water quality.' : 'Please check your system promptly.'}`;
    } else if (warningIssues.length > 0) {
      const warningText = warningIssues.length === 1
        ? `${warningIssues[0]} needs monitoring`
        : `${warningIssues.map(p => p.toLowerCase()).join(' and ')} need attention`;
      overallInsight = `Hey ${userName}, your water quality is stable but ${warningText} to prevent future issues. ${isRaining ? 'Keep monitoring closely with the recent rainfall.' : 'Regular monitoring is recommended.'}`;
    } else {
      overallInsight = `Hey ${userName}, your water quality looks good! All parameters are within safe ranges. ${isRaining ? 'Continue monitoring during wet weather to ensure stability.' : 'Keep up the excellent maintenance.'}`;
    }

    console.log("🔄 Generated fallback insight:", overallInsight.substring(0, 50) + "...");

    return {
      insights: {
        overallInsight,
        timestamp: new Date().toISOString(),
        source: 'alert-level-fallback'
      },
      suggestions
    };
  } catch (error) {
    console.error("❌ Error in generateIntelligentFallbackResponse:", error);
    // Return safe fallback if anything fails
    return {
      insights: {
        overallInsight: "Water quality monitoring is active. Check individual parameter cards for current readings.",
        timestamp: new Date().toISOString(),
        source: 'error-fallback'
      },
      suggestions: []
    };
  }
};

/**
 * Get tailored recommendations for specific parameters based on alert level
 */
const getParameterRecommendations = (parameter, alertLevel, value, isRaining) => {
  const recommendations = [];

  switch (parameter) {
    case 'pH':
      if (alertLevel === 'critical') {
        recommendations.push('Add baking soda to raise pH or white vinegar to lower pH');
        recommendations.push('Stop feeding fish until pH becomes stable');
        if (isRaining) {
          recommendations.push('Check water after rain as rain can change pH levels');
        }
      } else {
        recommendations.push('Add small amounts of pH adjusters when needed');
        recommendations.push('Compare with tap water pH if available');
      }
      break;

    case 'temperature':
      if (alertLevel === 'critical') {
        recommendations.push('Add shade cloth or move pond to reduce temperature');
        recommendations.push('Add frozen water bottles to cool water gradually');
        recommendations.push('Stop feeding until water cools down');
      } else {
        recommendations.push('Provide more shade during peak sunlight hours');
        recommendations.push('Monitor water temperature regularly');
      }
      break;

    case 'salinity':
      if (alertLevel === 'critical') {
        recommendations.push('Change some water to reduce or increase salt levels');
        if (isRaining) {
          recommendations.push('Add salt if needed after rain dilutes water');
        }
      } else {
        recommendations.push('Adjust salt levels gradually as needed');
        recommendations.push('Check if current salt amounts are right for your fish');
      }
      break;

    case 'turbidity':
      if (alertLevel === 'critical') {
        recommendations.push('Change some of the cloudy water with clean water');
        recommendations.push('Clean pond filters and check water flow');
        recommendations.push('Move fish to clean tank temporarily if water stays cloudy');
        if (isRaining) {
          recommendations.push('Rain water may be causing the cloudiness');
        }
      } else {
        recommendations.push('Clean filters regularly');
        recommendations.push('Feed fish less to reduce waste in water');
        recommendations.push('Make sure water moves and circulates well');
      }
      break;
  }

  return recommendations;
};

export const useHomeInsights = (realtimeData) => {
  const [homeInsight, setHomeInsight] = useState(null);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [lastSuccess, setLastSuccess] = useState(null);

  // Timer ref for dynamic intervals
  const timerRef = useRef();

  // Generate insights function
  const generateInsights = useCallback(async (isAutoRefresh = false) => {
    if (!realtimeData) {
      setHomeInsight(null);
      setLastSuccess(null);
      return;
    }

    // Extract sensor data properly (same as RealtimeDataCards)
    const sensorData = realtimeData.reading || realtimeData;

    // Skip if still loading and this is an auto-refresh call
    if (isHomeLoading && isAutoRefresh) {
      return;
    }

    setIsHomeLoading(true);
    try {
      // Compute alert levels for each parameter and include them in sensorData
      const enhancedSensorData = await computeAlertLevels(sensorData);

      const { generateInsight } = await import("@services/ai/geminiAPI");
      const insight = await generateInsight(enhancedSensorData, "home-overall-insight");
      setHomeInsight(insight);
      setLastSuccess(Date.now());
    } catch (error) {
      console.error("❌ Error generating home insights:", error);

      // Generate smart alert-level-based fallback insights
      try {
        const enhancedSensorData = await computeAlertLevels(sensorData);
        const fallbackInsight = await generateIntelligentFallbackResponse(enhancedSensorData);
        console.log("🔄 Generated fallback insight:", fallbackInsight?.insights?.overallInsight);
        setHomeInsight(fallbackInsight);
        console.log("🔄 Using intelligent alert-based fallback insights");
      } catch (fallbackError) {
        console.error("❌ Fallback insight generation failed:", fallbackError);
        // Ultra-safe fallback - hardcoded response
        console.log("🔥 Using ultra-safe hardcoded fallback");
        setHomeInsight({
          insights: {
            overallInsight: "Hey there! Your water quality monitoring is active. Check individual parameter cards for current readings.",
            timestamp: new Date().toISOString(),
            source: "error-fallback"
          },
          suggestions: []
        });
      }

      setLastSuccess(null);
    } finally {
      setIsHomeLoading(false);
    }
  }, [realtimeData, isHomeLoading]);

  // Debounced version for real-time data changes (5-minute debounce)
  const debouncedGenerateInsights = useCallback(
    debounce((data) => {
      if (data && !isHomeLoading) {
        generateInsights();
      }
    }, 5 * 60 * 1000), // 5 minutes debounce
    [generateInsights, isHomeLoading]
  );

  // Schedule next refresh based on last result (longer intervals)
  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Don't auto-refresh if we have encountered errors (prevent endless loading cycles)
    if (!lastSuccess) {
      console.log("🔄 Skipping auto-refresh due to recent errors");
      return;
    }

    const intervalMs = lastSuccess ? 60 * 60 * 1000 : 10 * 60 * 1000; // 60 min if success, 10 min if failure

    timerRef.current = setTimeout(() => {
      generateInsights(true); // Pass true for auto-refresh
    }, intervalMs);
  }, [lastSuccess, generateInsights]);

  // Initial generation when realtimeData becomes available (immediate)
  useEffect(() => {
    if (realtimeData && !isHomeLoading) {
      generateInsights();
    }
  }, [realtimeData ? 'available' : null]); // Only trigger when data first becomes available

  // Debounced effect for data changes (wait for stability)
  useEffect(() => {
    if (realtimeData) {
      debouncedGenerateInsights(realtimeData);
    }
  }, [realtimeData, debouncedGenerateInsights]);

  // Setup auto-refresh when loading completes
  useEffect(() => {
    if (!isHomeLoading) {
      scheduleNextRefresh();
    }
  }, [isHomeLoading, scheduleNextRefresh]);

  return { homeInsight, isHomeLoading };
};

export default useHomeInsights;
