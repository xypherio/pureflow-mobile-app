import { useEffect, useState } from "react";

/**
 * Custom hook for managing forecast insight generation and Firebase sync
 */
export const useForecastInsights = (forecastPredicted, dataSource) => {
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  useEffect(() => {
    if (forecastPredicted) {
      const generateInsights = async () => {
        setIsGeminiLoading(true);
        try {
          const { generateInsight } = await import("@services/ai/geminiAPI");
          const insight = await generateInsight(forecastPredicted, "forecast-overall-insight");
          setGeminiResponse(insight);
        } catch (error) {
          console.error("❌ Error generating forecast insights:", error);
          setGeminiResponse(null);
        } finally {
          setIsGeminiLoading(false);
        }
      };
      generateInsights();
    } else {
      setGeminiResponse(null);
    }
  }, [forecastPredicted]);

  // Firebase sync is now handled in useForecastService to avoid duplicates

  return { geminiResponse, isGeminiLoading };
};

export default useForecastInsights;
