import React, { useCallback, useState, useEffect } from "react";
import { Alert, StyleSheet } from "react-native";
import * as FileSystem from 'expo-file-system';

// Components
import ExportToggleButton from "@components/forms/ExportToggleButton";
import PureFlowLogo from "@components/ui/UiHeader";
import SegmentedFilter from "@navigation/SegmentedFilters";
import GlobalWrapper from "@ui/GlobalWrapper";
import { ReportSkeleton } from "@components/ui/LoadingSkeletons";

// Report Components
import ReportContent from "@components/sections/ReportContent";
import ReportErrorState from "@components/sections/ReportErrorState";

// Hooks
import { useReportData } from "@hooks/useReportData";

// Utils & Constants
import { timePeriodOptions } from "@constants/report";
import { generateCsv, prepareExportData, shareFiles } from "@utils/exportUtils";
import PdfGenerator from "../../src/PdfGenerator";
import { weatherService } from "@services/weatherService";

const ReportScreen = () => {
  const [activeFilter, setActiveFilter] = useState("daily");
  const [isExporting, setIsExporting] = useState(false);
  const [weatherData, setWeatherData] = useState(null);

  // Fetch weather data for reports
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const weather = await weatherService.getCurrentWeatherByCity('Cebu City');
        setWeatherData(weather);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherData(weatherService.getFallbackWeather());
      }
    };

    fetchWeather();
  }, []);

  // Use the custom report data hook to manage all report logic
  const {
    reportData,
    processedParameters,
    geminiResponse,
    isGeminiLoading,
    isSwitchingFilter,
    error,
    isLoading,
    showError,
    getParameterInsight,
    onRefresh,
  } = useReportData(activeFilter);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = prepareExportData(
        reportData,
        processedParameters,
        geminiResponse,
        weatherData,
        activeFilter
      );
      await PdfGenerator(exportData);

      Alert.alert(
        "PDF Report Generated",
        "Your water quality report has been successfully generated and shared.",
        [{ text: "OK", style: "cancel" }]
      );
    } catch (error) {
      console.error("PDF Generation Error:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate PDF report. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, [reportData, processedParameters, geminiResponse, weatherData, activeFilter]);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = prepareExportData(
        reportData,
        processedParameters,
        geminiResponse,
        weatherData,
        activeFilter
      );
      const { filePath } = await generateCsv(exportData);

      // Try to auto-open the file
      try {
        await FileSystem.openDocumentAsync(filePath);
        console.log('CSV opened successfully');
      } catch (openError) {
        console.error('Failed to open CSV:', openError);
        // Fallback to share option
        Alert.alert("CSV Report Generated", `Report saved to: ${filePath}`, [
          {
            text: "OK",
            onPress: () => shareFiles([filePath], "Share Water Quality Report"),
          },
        ]);
      }
    } catch (error) {
      console.error("CSV Generation Error:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate CSV report. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, [reportData, processedParameters, geminiResponse, weatherData, activeFilter]);

  // Render loading state
  if (isLoading) {
    return (
      <>
      <PureFlowLogo />
        <SegmentedFilter
          options={timePeriodOptions}
          selectedValue={activeFilter}
          onValueChange={setActiveFilter}
          style={styles.filter}
          disabled={true}
        />
        <GlobalWrapper>
          <ReportSkeleton />
        </GlobalWrapper>
        <ExportToggleButton
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
        />
      </>
    );
  }

  // Render error state
  if (showError) {
    return <ReportErrorState error={error} reportData={reportData} onRefresh={onRefresh} />;
  }

  // Render main content
  return (
    <>
      <PureFlowLogo />

      <SegmentedFilter
        options={timePeriodOptions}
        selectedValue={activeFilter}
        onValueChange={setActiveFilter}
        style={styles.filter}
      />

      <GlobalWrapper>
        <ReportContent
          reportData={reportData}
          processedParameters={processedParameters}
          geminiResponse={geminiResponse}
          isGeminiLoading={isGeminiLoading}
          isSwitchingFilter={isSwitchingFilter}
          loading={isLoading}
          onRefresh={onRefresh}
          getParameterInsight={getParameterInsight}
          activeFilter={activeFilter}
        />
      </GlobalWrapper>

      <ExportToggleButton
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />
    </>
  );
};

const styles = StyleSheet.create({
  filter: {
    position: "absolute",
    top: 100,
    zIndex: 1000,
    left: 15,
    right: 15,
  },
});

export default ReportScreen;
