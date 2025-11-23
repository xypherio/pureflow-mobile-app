import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Utils
import { getParameterTheme, hexToRgba } from "@utils/forecastUtils";

const ParameterDetails = ({ selectedParam, setSelectedParam, geminiResponse }) => {
  if (!selectedParam) {
    return (
      <View style={styles.promptCard}>
        <Text style={styles.promptIcon}>👆</Text>
        <Text style={styles.promptTitle}>Select a Parameter</Text>
        <Text style={styles.promptText}>
          Tap any parameter card above to view detailed forecast information, insights, and recommendations.
        </Text>
      </View>
    );
  }

  const theme = getParameterTheme(selectedParam);

  return (
    <View style={[styles.detailsContainer, { borderColor: theme.color, shadowColor: theme.color }]}>
      {/* Gradient overlay */}
      <View style={[styles.gradientOverlay, { backgroundColor: theme.color }]} />

      <Text style={[styles.sectionTitle, { backgroundColor: hexToRgba(theme.color, 1.0) }]}>Influencing Factors</Text>
      <View style={styles.factorsList}>
        {(() => {
          const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
          const factors = suggestion?.influencingFactors || [
            "Rainfall intensity affecting water dilution",
            "Temperature fluctuations impacting solubility",
            "Low sunlight reducing photosynthesis"
          ];
          return factors.map((factor, index) => (
            <Text key={index} style={styles.factor}>• {factor}</Text>
          ));
        })()}
      </View>

      <Text style={[styles.sectionTitle, { backgroundColor: hexToRgba(theme.color, 1.0) }]}>Recommended Actions</Text>
      <View style={styles.actionsList}>
        {(() => {
          const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
          const actions = suggestion?.recommendedActions || [
            "Adjust feeding schedules based on water conditions",
            "Increase aeration to maintain oxygen levels",
            "Regularly check ammonia and nitrite levels"
          ];
          return actions.map((action, index) => (
            <Text key={index} style={styles.action}>• {action}</Text>
          ));
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  promptCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007bff",
    borderStyle: "dashed",
  },
  promptIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginVertical: 5,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.3,
  },
  factorsList: {
    marginBottom: 15,
  },
  factor: {
    fontSize: 15,
    color: "#555",
    marginBottom: 5,
    lineHeight: 20,
  },
  actionsList: {
    marginBottom: 15,
  },
  action: {
    fontSize: 15,
    color: "#333",
    marginBottom: 5,
    lineHeight: 20,
    fontStyle: "italic",
  },
  aiInsight: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  insightText: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "white",
    color: "#1A3F7A",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: "100%",
    textAlign: "center",
    marginBottom: 8,
  },
});

export default ParameterDetails;
