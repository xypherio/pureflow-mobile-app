import { FileDown, FileJson, FileText } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet, // Re-added Text
  TouchableOpacity,
  View,
} from "react-native";

export default function ExportToggleButton({
  isExporting,
  onExportPdf, // New prop for exporting PDF
  onExportCsv, // New prop for exporting CSV
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const newState = !prev;
      Animated.spring(animation, {
        toValue: newState ? 1 : 0,
        friction: 8,
        tension: 120,
        useNativeDriver: false,
      }).start();
      return newState;
    });
  }, [animation]);

  const handleExportPdfPress = useCallback(async () => {
    setIsExpanded(false); // Collapse after action
    Animated.spring(animation, {
      toValue: 5,
      friction: 5,
      tension: 180,
      useNativeDriver: false,
    }).start();
    if (onExportPdf) {
      setPdfLoading(true); // Start PDF loading
      await onExportPdf();
      setPdfLoading(false); // End PDF loading
    }
  }, [onExportPdf, animation]);

  const handleExportCsvPress = useCallback(async () => {
    setIsExpanded(false); // Collapse after action
    Animated.spring(animation, {
      toValue: 0,
      friction: 8,
      tension: 120,
      useNativeDriver: false,
    }).start();
    if (onExportCsv) {
      setCsvLoading(true); // Start CSV loading
      await onExportCsv();
      setCsvLoading(false); // End CSV loading
    }
  }, [onExportCsv, animation]);

  const pdfButtonTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20], // First option, reduced spacing
  });

  const csvButtonTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30], // Second option, reduced spacing
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {isExpanded && (
        <>
          <Animated.View
            style={[
              styles.optionButtonWrapper,
              { transform: [{ translateY: csvButtonTranslateY }], opacity },
            ]}
          >
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#d1fae5" }]} // Green for CSV
              onPress={handleExportCsvPress}
              disabled={isExporting || csvLoading}
              activeOpacity={0.8}
            >
              {csvLoading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <FileJson size={22} color="#059669" />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.optionButtonWrapper,
              { transform: [{ translateY: pdfButtonTranslateY }], opacity },
            ]}
          >
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#ffa79e" }]}
              onPress={handleExportPdfPress}
              disabled={isExporting || pdfLoading}
              activeOpacity={0.8}
            >
              {pdfLoading ? (
                <ActivityIndicator size="small" color="#9e1e11" />
              ) : (
                <FileDown size={22} color="#9e1e11" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      <TouchableOpacity
        style={[styles.mainButton, isExporting && styles.mainButtonLoading]}
        onPress={toggleExpanded}
        disabled={isExporting || pdfLoading || csvLoading}
        activeOpacity={0.8}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <FileText size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110,
    right: 20,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2455a9",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonLoading: {
    backgroundColor: "#31a354",
  },
  optionButtonWrapper: {
    alignItems: "center",
    marginBottom: 5, // Reduced margin
  },
  optionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
