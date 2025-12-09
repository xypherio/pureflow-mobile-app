/** ReportLoadingState - Loading state during report generation with disabled filters and export options */
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PureFlowLogo from "@components/ui/UiHeader";
import SegmentedFilter from "@navigation/SegmentedFilters";
import GlobalWrapper from "@ui/GlobalWrapper";
import ExportToggleButton from "@components/forms/ExportToggleButton";
import { timePeriodOptions } from "@constants/report";

const ReportLoadingState = ({
  activeFilter,
  onFilterChange,
  onExportPdf,
  isExporting
}) => {
  return (
    <>
      <PureFlowLogo
        weather={{
          label: "Loading...",
          temp: "--°C",
          icon: "partly",
        }}
      />
      <SegmentedFilter
        options={timePeriodOptions}
        selectedValue={activeFilter}
        onValueChange={onFilterChange}
        style={styles.filter}
        disabled={true}
      />
      <GlobalWrapper>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading report data...</Text>
          </View>
        </View>
      </GlobalWrapper>

      <ExportToggleButton
        onExportPdf={onExportPdf}
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
  loadingContainer: {
    marginTop: 250,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 24,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
});

export default ReportLoadingState;
