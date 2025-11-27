import React, { useCallback, useState, useEffect } from "react";
import { Alert, StyleSheet } from "react-native";
import * as FileSystem from 'expo-file-system';

// Contexts
import { useWeather } from "@contexts/WeatherContext";

// Components
import ExportToggleButton from "@components/forms/ExportToggleButton";
import PureFlowLogo from "@components/ui/UiHeader";
import SegmentedFilter from "@navigation/SegmentedFilters";
import GlobalWrapper from "@ui/GlobalWrapper";
import { ReportSkeleton } from "@components/ui/LoadingSkeletons";
import SettingsModal from "@components/modals/SettingsModal";
import IssueReportingModal from "@components/modals/IssueReportingModal";
import FeatureRatingModal from "@components/modals/FeatureRatingModal";

// Report Components
import ReportContent from "@components/sections/ReportContent";
import ReportErrorState from "@components/sections/ReportErrorState";

// Hooks
import { useReportData } from "@hooks/useReportData";

// Utils & Constants
import { timePeriodOptions } from "@constants/report";
import { generateCsv, prepareExportData, shareFiles } from "@utils/exportUtils";
import PdfGenerator from "../../src/PdfGenerator";

const ReportScreen = () => {
  const [activeFilter, setActiveFilter] = useState("daily");
  const [isExporting, setIsExporting] = useState(false);

  // Use weather context (loads custom city automatically)
  const { currentWeather } = useWeather();

  // Modal states
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [isIssueReportingVisible, setIsIssueReportingVisible] = useState(false);

  const openSettingsModal = useCallback(() => {
    setIsSettingsVisible(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsVisible(false);
  }, []);

  const handleRateApp = useCallback(() => {
    setIsRatingVisible(true);
  }, []);

  const closeRatingModal = useCallback(() => {
    setIsRatingVisible(false);
  }, []);

  const handleReportIssue = useCallback(() => {
    setIsIssueReportingVisible(true);
  }, []);

  const closeIssueReportingModal = useCallback(() => {
    setIsIssueReportingVisible(false);
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
        currentWeather,
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
  }, [reportData, processedParameters, geminiResponse, currentWeather, activeFilter]);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData = prepareExportData(
        reportData,
        processedParameters,
        geminiResponse,
        currentWeather,
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
  }, [reportData, processedParameters, geminiResponse, currentWeather, activeFilter]);

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

  // Render main content (fallback to default view on errors)
  return (
    <>
      {/* Modals */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={closeSettingsModal}
        onRateApp={handleRateApp}
        onReportIssue={handleReportIssue}
      />

      <FeatureRatingModal
        visible={isRatingVisible}
        onClose={closeRatingModal}
        onSuccess={closeRatingModal}
      />

      <IssueReportingModal
        visible={isIssueReportingVisible}
        onClose={closeIssueReportingModal}
      />

      <PureFlowLogo onSettingsPress={openSettingsModal} />

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
