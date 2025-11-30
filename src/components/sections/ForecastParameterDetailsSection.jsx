import { Pointer } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Utils
import { getParameterTheme } from "@utils/forecastUtils";

const ParameterDetails = ({ selectedParam, setSelectedParam, geminiResponse }) => {
  if (!selectedParam) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parameter Details</Text>
        </View>

        <View style={[styles.container, styles.promptContainer]}>
          <View style={styles.gradientOverlay} />

          <View style={styles.promptContent}>
            <View style={styles.promptIconContainer}>
              <Pointer size={35} color="#3B82F6" style={styles.promptIcon} />
            </View>
            <Text style={styles.promptTitle}>Select a Parameter</Text>
            <Text style={styles.promptText}>
              Tap any parameter card above to view detailed forecast information, insights, and recommendations.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const theme = getParameterTheme(selectedParam);

  const getFactorsData = () => {
    const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
    return suggestion?.influencingFactors || [
      "Rainfall intensity affecting water dilution",
      "Temperature fluctuations impacting solubility",
      "Low sunlight reducing photosynthesis"
    ];
  };

  const getActionsData = () => {
    const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
    return suggestion?.recommendedActions || [
      "Adjust feeding schedules based on water conditions",
      "Increase aeration to maintain oxygen levels",
      "Regularly check ammonia and nitrite levels"
    ];
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Parameter Details</Text>
      </View>

      <View style={[styles.container, { borderColor: theme.color }]}>
        <View style={[styles.gradientOverlay, { backgroundColor: theme.color }]} />

        <View style={[styles.contentContainer, styles.noIconContent]}>
          <Text style={styles.title}>
            {selectedParam} Forecast Analysis
          </Text>

          <Text style={styles.description}>
            Detailed insights for {selectedParam.toLowerCase()} parameter including influencing factors and recommended actions.
          </Text>

          {/* Influencing Factors */}
          <View style={[styles.recommendationsCard, { borderLeftColor: theme.color }]}>
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, { color: theme.color }]}>
                🌧️ Influencing Factors:
              </Text>
              {getFactorsData().map((factor, index) => (
                <Text key={index} style={styles.recommendationItem}>
                  • {factor}
                </Text>
              ))}
            </View>
          </View>

          {/* Recommended Actions */}
          <View style={[styles.recommendationsCard, { borderLeftColor: theme.color }]}>
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, { color: theme.color }]}>
                💡 Recommended Actions:
              </Text>
              {getActionsData().map((action, index) => (
                <Text key={index} style={styles.recommendationItem}>
                  • {action}
                </Text>
              ))}
            </View>
          </View>

          {/* Status indicator */}
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Parameter Analysis</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Section styles (matching InsightsCard)
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51"
  },

  // Card container styles
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginVertical: 5,
    borderWidth: 1,
    borderTopWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  promptContainer: {
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    height: 200,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.3,
  },

  // Content layout styles
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
  },
  noIconContent: {
    flexDirection: 'column',
  },
  promptContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Typography styles
  title: {
    color: '#0f172a',
    marginBottom: 12,
    fontWeight: '700',
    letterSpacing: -0.025,
    lineHeight: 24,
    fontSize: 18,
  },
  description: {
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
    fontSize: 14,
    letterSpacing: 0.025,
  },

  // Prompt styles (for no selection state)
  promptIconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIcon: {
    fontSize: 30,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Recommendations styles
  recommendationsCard: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9ca3af',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendationsContainer: {
    paddingLeft: 4,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.025,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 12,
    marginBottom: 4,
    paddingLeft: 4,
  },

  // Status indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ParameterDetails;
