import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ReportErrorState = ({ error, reportData, onRefresh }) => {
  const router = useRouter();

  const navigateToHome = () => {
    router.push("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialIcons
          name="schedule"
          size={64}
          color="#3b82f6"
          style={styles.icon}
        />
        <Text style={styles.title}>PureFlow Report is Queuing</Text>
        <Text style={styles.message}>
          Your water quality report is being processed. Come back in a few minutes to see the latest insights and recommendations.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={onRefresh}>
            <Text style={styles.primaryButtonText}>Check Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={navigateToHome}>
            <Text style={styles.secondaryButtonText}>View Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tip</Text>
          <Text style={styles.tipsText}>
            Reports are generated from real sensor data. Ensure your PureFlow device is connected and collecting data for optimal results.
          </Text>
        </View>

        {__DEV__ && error?.details && (
          <View style={styles.devDetailsContainer}>
            <Text style={styles.devDetailsText}>{error.details}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  card: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb", // Blue text
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#1d4ed8", // Dark blue text
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  tipsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: "#1d4ed8",
    lineHeight: 20,
  },
  devDetailsContainer: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    width: "100%",
  },
  devDetailsText: {
    fontSize: 12,
    color: "#92400e",
    fontFamily: "monospace",
  },
});

export default ReportErrorState;
