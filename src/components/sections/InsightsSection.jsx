/** InsightsSection - Main insights section displaying AI-generated water quality analysis and recommendations */
import InsightsCard from "@dataDisplay/InsightsCard";
import { InsightsSkeleton } from "@ui/LoadingSkeletons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/**
 * Section displaying AI insights and recommendations
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Loading state from data context
 * @param {Object} props.realtimeData - Real-time sensor data
 * @param {Date} props.lastUpdate - Last data update timestamp
 * @param {Object} props.homeInsight - Home insights response object
 * @param {boolean} props.isHomeLoading - Home insights loading state
 */
const InsightsSection = ({ loading, realtimeData, lastUpdate, homeInsight, isHomeLoading }) => {
  if (loading || isHomeLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#4a90e2"
          style={styles.loadingIndicator}
        />
      </View>
    );
  }

  if (homeInsight) {
    // Extract recommendations from the insight suggestions
    const extractRecommendationsFromInsight = (insight) => {
      if (!insight?.suggestions || !Array.isArray(insight.suggestions)) return null;

      return insight.suggestions
        .flatMap(suggestion => {
          if (!suggestion || typeof suggestion !== 'object') return [];
          // Use recommendedActions, parameter, status for better display
          return suggestion.recommendedActions || [];
        })
        .filter(action => typeof action === 'string')
        .map(action => action.replace(/\*\*([^*]+)\*\*/g, '$1').trim())
        .filter(action => action.length > 0)
        .slice(0, 5);
    };

    return (
      <InsightsCard
        type="info"
        title="Water Quality Insights"
        description={homeInsight?.insights?.overallInsight || "Analyzing water quality data..."}
        recommendations={extractRecommendationsFromInsight(homeInsight)}
        sensorData={realtimeData}
        timestamp={homeInsight?.insights?.timestamp || lastUpdate}
        componentId="home-insights"
        autoRefresh={true}
        sectionTitle="Insights & Recommendations"
      />
    );
  }

  return <InsightsSkeleton />;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  insightsLabel: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 10,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default React.memo(InsightsSection);
