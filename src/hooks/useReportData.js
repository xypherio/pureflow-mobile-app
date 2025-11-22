import { useCallback, useEffect, useState, useMemo } from "react";
import { useChartData } from "./useChartData";
import { generateInsight } from "@services/ai/geminiAPI";
import { generateWaterQualityReport, prepareChartData } from "@utils/reportUtils";
import { PARAMETER_CONFIG } from "@constants/report";

export const useReportData = (activeFilter) => {
  // Consolidated state management
  const [reportData, setReportData] = useState({
    wqi: { value: 0, status: "normal" },
    parameters: {},
    status: "loading",
    message: "Loading report data...",
    generatedAt: null,
  });
  const [error, setError] = useState(null);
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isSwitchingFilter, setIsSwitchingFilter] = useState(false);

  // Use the useChartData hook to fetch data
  const {
    chartData,
    loading,
    error: chartError,
    refreshData,
  } = useChartData("reports", activeFilter);

  // Reset report data when filter changes
  useEffect(() => {
    setIsSwitchingFilter(true);
    setReportData({
      wqi: { value: 0, status: "unknown" },
      parameters: {},
      status: "loading",
      message: "Loading report data...",
      generatedAt: null,
      overallStatus: "unknown",
    });
    setIsGeminiLoading(false);

    // Clear filter switching flag after a short delay
    const timer = setTimeout(() => setIsSwitchingFilter(false), 100);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  // Process chart data and generate report
  useEffect(() => {
    if (chartData && !loading) {
      try {
        if (chartData.length === 0) {
          setReportData({
            wqi: { value: 0, status: "unknown" },
            parameters: {},
            status: "empty",
            message: "No data available for the selected time period",
            generatedAt: new Date().toISOString(),
            overallStatus: "unknown",
          });
          setError(null);
          return;
        }

        const report = generateWaterQualityReport(chartData, activeFilter);
        setReportData({
          ...report,
          generatedAt: new Date().toISOString(),
          timePeriod: activeFilter,
        });
        setError(null);
      } catch (err) {
        setError({
          message: "Failed to generate report from chart data",
          details: "Data processing error",
        });
        setReportData({
          status: "error",
          message: err.message || "Report generation failed",
          parameters: {},
          wqi: { value: 0, status: "unknown" },
          generatedAt: new Date().toISOString(),
        });
      }
    } else if (chartError) {
      setError({
        message: "Failed to fetch chart data",
        details: "Data retrieval error",
      });
    }
  }, [chartData, chartError, activeFilter, loading]);

  // Generate AI insights when report data changes
  useEffect(() => {
    if (
      reportData &&
      reportData.parameters &&
      Object.keys(reportData.parameters).length > 0
    ) {
      const getInsight = async () => {
        setIsGeminiLoading(true);
        setGeminiResponse(null);
        try {
          const insight = await generateInsight(
            reportData,
            "report-overall-insight"
          );
          setGeminiResponse(insight);
        } catch (error) {
          setGeminiResponse(null);
        } finally {
          setIsGeminiLoading(false);
        }
      };
      getInsight();
    } else {
      setGeminiResponse(null);
    }
  }, [reportData]);

  // Memoized processed parameters
  const processedParameters = useMemo(() => {
    return Object.entries(reportData.parameters || {}).map(([key, value]) => {
      const config = PARAMETER_CONFIG[key] || {};

      const averageValue =
        typeof value?.average === "number" && Number.isFinite(value.average)
          ? value.average
          : null;

      let chartData = { labels: [], datasets: [{ data: [] }] };
      try {
        chartData = prepareChartData(reportData, key);
      } catch (err) {
        chartData = { labels: [], datasets: [{ data: [] }] };
      }

      return {
        parameter: config.displayName || key,
        value: averageValue !== null ? averageValue.toFixed(2) : "N/A",
        averageValue,
        unit: config.unit || "",
        safeRange: config.safeRange || "",
        status: value?.status || "normal",
        analysis: value?.trend?.message || "No trend data available",
        minValue:
          typeof value?.min === "number" && Number.isFinite(value.min)
            ? value.min
            : null,
        maxValue:
          typeof value?.max === "number" && Number.isFinite(value.max)
            ? value.max
            : null,
        chartData: {
          labels: chartData?.labels || [],
          datasets: [
            {
              data: chartData?.datasets?.[0]?.data || [],
              colors: Array(chartData?.datasets?.[0]?.data?.length || 0).fill(
                (opacity = 1) => getStatusColor(value?.status || "normal")
              ),
            },
          ],
        },
      };
    });
  }, [reportData]);

  // Find insight for parameter from geminiResponse
  const getParameterInsight = useCallback((parameterName) => {
    if (!geminiResponse?.suggestions) return null;

    const suggestion = geminiResponse.suggestions.find(s => {
      const suggestionParam = s.parameter?.toLowerCase()?.replace(/\s+/g, '') || '';
      const currentParam = parameterName?.toLowerCase()?.replace(/\s+/g, '') || '';
      return suggestionParam === currentParam ||
             suggestionParam.includes(currentParam) ||
             currentParam.includes(suggestionParam);
    });

    return suggestion?.recommendation || null;
  }, [geminiResponse]);

  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Determine if we should show loading state
  const isLoading = loading || (chartData === null && !error);

  // Determine if we should show error state
  const showError = reportData.status === "error" || error;

  return {
    // State
    reportData,
    processedParameters,
    geminiResponse,
    isGeminiLoading,
    isSwitchingFilter,
    error,
    isLoading,
    showError,
    loading,

    // Actions
    getParameterInsight,
    onRefresh,
  };
};
