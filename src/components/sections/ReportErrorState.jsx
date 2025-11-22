import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ReportErrorState = ({ error, reportData, onRefresh }) => {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <Ionicons
          name="warning-outline"
          size={54}
          color="#ef4444"
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>Report Unavailable</Text>
        <Text style={styles.errorMessage}>
          {error?.message ||
            reportData.message ||
            "Failed to load report data"}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        {__DEV__ && error?.details && (
          <View style={styles.errorDetailsContainer}>
            <Text style={styles.errorDetailsText}>{error.details}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorCard: {
    backgroundColor: "#ffeaea",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    shadowColor: "#ef4444",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorIcon: {
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    color: "#b91c1c",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  errorDetailsContainer: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "100%",
  },
  errorDetailsText: {
    fontSize: 12,
    color: "#b91c1c",
    fontFamily: "monospace",
  },
});

export default ReportErrorState;
