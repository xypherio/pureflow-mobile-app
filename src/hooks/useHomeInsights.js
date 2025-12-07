import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash";

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
      const { generateInsight } = await import("@services/ai/geminiAPI");
      const insight = await generateInsight(sensorData, "home-overall-insight");
      setHomeInsight(insight);
      setLastSuccess(Date.now());
    } catch (error) {
      console.error("❌ Error generating home insights:", error);
      setHomeInsight(null);
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
