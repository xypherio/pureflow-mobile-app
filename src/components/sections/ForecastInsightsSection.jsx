/** ForecastInsightsSection - Forecast-specific AI insights with fallback static recommendations */
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Components
import InsightsCard from "@dataDisplay/InsightsCard";
import { ForecastInsightsSkeleton } from "@ui/LoadingSkeletons";

// Environment check
const isProduction = __DEV__ === false;

/**
 * Generate contextual static forecast insights when AI is unavailable
 */
const generateStaticForecastInsight = (forecastDataAvailable, forecastPredicted) => {
  let overallInsight;
  let suggestions = [];

  // Validate forecastPredicted structure
  const isValidForecastData = forecastPredicted &&
    typeof forecastPredicted === 'object' &&
    !Array.isArray(forecastPredicted);

  if (!forecastDataAvailable) {
    // No forecast data available
    overallInsight = "Forecast predictions will be available once your sensors collect more historical data. For now, focus on maintaining stable water conditions with regular monitoring.";

    suggestions = [
      {
        parameter: "monitoring",
        influencingFactors: ["Limited historical data", "New sensor setup"],
        recommendedActions: ["Test water parameters twice daily", "Record readings manually if needed", "Allow sensors to collect data for accurate predictions"],
        status: "normal"
      }
    ];
  } else if (isValidForecastData && Object.keys(forecastPredicted).length > 0) {
    // Forecast data is available but might be basic
    const paramCount = Object.keys(forecastPredicted).length;
    const hasMultipleParams = paramCount >= 3;

    if (hasMultipleParams) {
      overallInsight = `Forecast data is available for ${paramCount} parameters. Your 24-hour predictions show steady water conditions - you can expect stable readings with no major changes in the next day.`;
    } else {
      overallInsight = `Basic forecast data available. Your predicted water conditions appear stable for the next 24 hours. Consider adding more sensors for detailed predictions.`;
    }

    suggestions = [
      {
        parameter: "forecast",
        influencingFactors: ["Weather patterns", "Water stability"],
        recommendedActions: ["Monitor actual vs predicted readings", "Adjust feeding if water gets cloudy", "Prepare backup water source if heavy rain predicted"],
        status: "normal"
      }
    ];

    // Add parameter-specific suggestions if available
    if (isValidForecastData && typeof forecastPredicted.temperature === 'number') {
      suggestions.push({
        parameter: "temperature",
        influencingFactors: ["Weather conditions", "Water depth"],
        recommendedActions: ["Check pond depth before hot days", "Monitor for sudden temperature drops", "Consider shade additions if needed"],
        status: "normal"
      });
    }

    if (isValidForecastData && typeof forecastPredicted.pH === 'number') {
      suggestions.push({
        parameter: "pH",
        influencingFactors: ["Water movement", "Fish activity"],
        recommendedActions: ["Test pH daily", "Keep some baking soda ready", "Avoid overfeeding to prevent pH drops"],
        status: "normal"
      });
    }
  } else {
    // Edge case: marked as available but no data
    overallInsight = "Forecast data collection is in progress. Your sensors are working but predictions are still being refined. Check back in a few hours.";

    suggestions = [
      {
        parameter: "setup",
        influencingFactors: ["Data collection period"],
        recommendedActions: ["Continue normal pond maintenance", "Manually monitor water quality", "Predictions will improve with time"],
        status: "normal"
      }
    ];
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

const ForecastInsights = ({
  isGeminiLoading,
  geminiResponse,
  forecastDataAvailable,
  forecastPredicted
}) => {
  // Loading state - show skeleton while AI is processing
  if (isGeminiLoading) {
    return <ForecastInsightsSkeleton />;
  }

  // AI response available - show AI-powered insights
  if (geminiResponse &&
      typeof geminiResponse === 'object' &&
      geminiResponse.insights &&
      typeof geminiResponse.insights === 'object' &&
      geminiResponse.insights.overallInsight &&
      typeof geminiResponse.insights.overallInsight === 'string') {
    return (
      <InsightsCard
        type="info"
        title="Overall Forecast Insight"
        description={geminiResponse.insights.overallInsight}
        timestamp={geminiResponse.insights.timestamp || new Date().toISOString()}
        componentId="forecast-overall-insight"
        autoRefresh={true}
        sensorData={forecastPredicted}
        sectionTitle="Insights & Suggestions"
      />
    );
  }

  // No AI response - show rich static forecast insights
  // This ensures users always see meaningful content
  const staticInsight = generateStaticForecastInsight(forecastDataAvailable, forecastPredicted);

  if (!isProduction) {
    console.log("📊 Forecast showing static content due to AI unavailability:", staticInsight.insights.overallInsight);
  }

  return (
    <InsightsCard
      type="info"
      title="Forecast Status & Insights"
      description={staticInsight.insights.overallInsight}
      timestamp={staticInsight.insights.timestamp}
      componentId="forecast-static-fallback"
      autoRefresh={false}
      sensorData={forecastPredicted}
      sectionTitle="Insights & Suggestions"
      recommendations={staticInsight.suggestions}
    />
  );
};

const styles = StyleSheet.create({
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 5,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  noDataText: {
    color: "#856404",
    fontSize: 12,
    textAlign: "center",
  },
});

export default ForecastInsights;
