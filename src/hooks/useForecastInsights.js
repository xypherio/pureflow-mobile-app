import { useEffect, useState, useCallback } from "react";
import { debounce } from "lodash";

export const useForecastInsights = (forecastPredicted, trends, dataSource) => {
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // Generate insights function
  const generateInsights = useCallback(async () => {
    if (!forecastPredicted || !trends) {
      setGeminiResponse(null);
      return;
    }

    setIsGeminiLoading(true);
    try {
      const { generateForecastInsight } = await import("@services/ai/geminiAPI");
      const insight = await generateForecastInsight(forecastPredicted, trends);
      setGeminiResponse(insight);
    } catch (error) {
      console.error("❌ Error generating forecast insights:", error);
      setGeminiResponse(null);
    } finally {
      setIsGeminiLoading(false);
    }
  }, [forecastPredicted, trends]);

  // Debounced version for forecast data changes (10-minute debounce)
  const debouncedGenerateInsights = useCallback(
    debounce(() => {
      generateInsights();
    }, 10 * 60 * 1000), // 10 minutes debounce
    [generateInsights]
  );

  useEffect(() => {
    if (forecastPredicted && trends) {
      debouncedGenerateInsights();
    } else {
      setGeminiResponse(null);
    }
  }, [forecastPredicted, trends, debouncedGenerateInsights]);

  // Firebase sync is now handled in useForecastService to avoid duplicates

  return { geminiResponse, isGeminiLoading };
};

export default useForecastInsights;
