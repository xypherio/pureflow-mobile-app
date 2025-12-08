// Core imports
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

// Third-party imports
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';

// Local imports
import { useInsightManager } from '@hooks/useInsightManager';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Environment configuration
const isProduction = __DEV__ === false;
const DEFAULT_SECTION_TITLE = 'Insights & Recommendations';

// UI theme configuration
const INSIGHT_TYPES = {
  positive: {
    icon: CheckCircle,
    bgColor: '#ECFDF5',
    iconColor: '#059669',
    borderColor: '#10B981',
    gradientColors: ['#D1FAE5', '#A7F3D0'],
    shadowColor: '#10B981'
  },
  warning: {
    icon: AlertCircle,
    bgColor: '#FFFBEB',
    iconColor: '#D97706',
    borderColor: '#F59E0B',
    gradientColors: ['#FEF3C7', '#FDE68A'],
    shadowColor: '#F59E0B'
  },
  critical: {
    icon: AlertTriangle,
    bgColor: '#FEF2F2',
    iconColor: '#DC2626',
    borderColor: '#EF4444',
    gradientColors: ['#FEE2E2', '#FECACA'],
    shadowColor: '#EF4444'
  },
  info: {
    icon: Info,
    bgColor: '#EFF6FF',
    iconColor: '#2563EB',
    borderColor: '#3B82F6',
    gradientColors: ['#DBEAFE', '#BFDBFE'],
    shadowColor: '#3B82F6'
  },
  empty: {
    icon: Info,
    bgColor: '#F9FAFB',
    iconColor: '#6B7280',
    borderColor: '#E5E7EB',
    gradientColors: ['#F9FAFB', '#F3F4F6'],
    shadowColor: '#6B7280'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Development-only logging utility
 */
const silentLog = (message, ...args) => {
  if (!isProduction) {
    console.log(message, ...args);
  }
};

/**
 * Development-only error logging utility
 */
const silentError = (message, error) => {
  if (!isProduction) {
    console.error(message, error);
  }
};

/**
 * Safely converts values to strings for display
 */
const safeString = (value) => {
  if (value === null || value === undefined) {
    return "No data available";
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Determines screen size for responsive design
 */
const useScreenSize = () => {
  const { width } = Dimensions.get('window');
  return {
    isLargeScreen: width > 500,
    screenWidth: width
  };
};

// ============================================================================
// COMPONENT LOGIC HOOKS
// ============================================================================

/**
 * Custom hook for insight-related state and logic
 */
const useInsightState = (componentId, sensorData, autoRefresh) => {
  // Always call useInsightManager - it handles empty sensorData internally
  const insightData = useInsightManager(componentId, sensorData, { autoRefresh });

  const { insight, loading: insightLoading, error: insightError } = insightData;

  return {
    insight,
    insightLoading,
    insightError
  };
};

/**
 * Custom hook for determining display state and configuration
 */
const useDisplayConfig = (type, hasStaticContent, hasAIInsight, insightLoading, insightError) => {
  // Determine which config to use based on state
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.info;

  const isEmpty = !hasAIInsight && !hasStaticContent && !insightLoading;
  const isError = insightError && !hasStaticContent;

  // Determine which config to use
  const displayConfig = isEmpty ? INSIGHT_TYPES.empty : isError ? INSIGHT_TYPES.critical : config;

  return {
    config,
    displayConfig,
    isEmpty,
    isError
  };
};

/**
 * Custom hook for status information
 */
  const useStatusInfo = (insightError, insightLoading, hasAIInsight, hasStaticContent, insight) => {
    const getStatusColor = () => {
      if (insightLoading) return '#F59E0B'; // Yellow for loading
      if (hasAIInsight) return '#10B981'; // Green for AI
      if (hasStaticContent) return '#10B981'; // Green for fallback content
      if (insightError) return '#F59E0B'; // Yellow for error (when no content available)
      return '#6B7280'; // Gray for waiting
    };

    const getStatusText = () => {
      if (insightLoading) return 'Generating...';
      if (hasAIInsight) return 'AI Generated';
      if (hasStaticContent) {
        const source = insight?.insights?.source;
        if (source === 'alert-level-fallback') return 'Alert Analysis'; // New intelligent fallback
        return 'Content Available'; // Traditional fallback
      }
      if (insightError) return 'Alert Analysis'; // Show alert analysis instead of error
      return 'Waiting for Data';
    };

    return {
      statusColor: getStatusColor(),
      statusText: getStatusText()
    };
  };

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InsightsCard({
  type = 'info',
  title,
  description,
  suggestion,
  recommendations,
  action,
  onActionPress,
  timestamp,
  sensorData,
  componentId = 'insights-card',
  autoRefresh = true,
  sectionTitle = DEFAULT_SECTION_TITLE
}) {
  const { isLargeScreen } = useScreenSize();

  // Animation state
  const [opacity] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Insight state and data
  const { insight, insightLoading, insightError } = useInsightState(componentId, sensorData, autoRefresh);

  // Content availability checks
  const hasStaticContent = description || suggestion || (recommendations && recommendations.length > 0);
  const hasAIInsight = insight && insight.insight;

  // Display configuration
  const { config, displayConfig, isEmpty, isError } = useDisplayConfig(
    type,
    hasStaticContent,
    hasAIInsight,
    insightLoading,
    insightError
  );

  // Status information
  const { statusColor, statusText } = useStatusInfo(
    insightError,
    insightLoading,
    hasAIInsight,
    hasStaticContent,
    insight
  );

  // Timestamp logic
  const lastUpdated = hasAIInsight ? insight.lastUpdated : timestamp || new Date();

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderContent = () => {
    // Loading state
    if (insightLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4a90e2" style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Generating AI insights...</Text>
        </View>
      );
    }

    // Error state
    if (isError) {
      return (
        <Text style={[styles.description, styles.errorText]} accessibilityLabel="Error message">
          Unable to generate insights at this time. Please try refresh data if the issue persists.
        </Text>
      );
    }

    // Empty state
    if (isEmpty) {
      return (
        <Text style={styles.description} accessibilityLabel="Empty state message">
          {"Insights will be available once your water quality sensors start collecting data and our AI analyzes the trends."}
        </Text>
      );
    }

    // AI insight content
    if (hasAIInsight) {
      return (
        <Text style={styles.description} accessibilityLabel={`AI Insight: ${safeString(insight.insight)}`}>
          {safeString(insight.insight)}
        </Text>
      );
    }

    // Static description content
    if (hasStaticContent && description) {
      return (
        <Text style={styles.description} accessibilityLabel={`Description: ${safeString(description)}`}>
          {safeString(description)}
        </Text>
      );
    }

    // Fallback
    return (
      <Text style={styles.description} accessibilityLabel="No insights available">
        No insights available
      </Text>
    );
  };

  const renderRecommendations = () => {
    // Ultra-defensive recommendation processing to prevent React object rendering errors
    const getSafeRecommendations = () => {
      try {
        // First priority: static recommendations prop
        if (recommendations && Array.isArray(recommendations)) {
          return recommendations
            .flatMap(rec => {
              // Handle case where rec might be an object with recommendedActions
              if (rec && typeof rec === 'object' && rec.recommendedActions) {
                return Array.isArray(rec.recommendedActions) ? rec.recommendedActions : [];
              }
              // Handle case where rec might be a string
              return typeof rec === 'string' ? [rec] : [];
            })
            .filter(rec => typeof rec === 'string')
            .slice(0, 8);
        }

        // Second priority: extract from AI insight suggestions
        if (insight?.suggestions && Array.isArray(insight.suggestions)) {
          return insight.suggestions
            .flatMap(suggestion => {
              if (!suggestion || typeof suggestion !== 'object') return [];
              const actions = suggestion.recommendedActions;
              // Ensure actions is an array and filter to strings only
              return Array.isArray(actions) ? actions.filter(action => typeof action === 'string') : [];
            })
            .slice(0, 8);
        }

        // Third priority: look for influencing factors as fallback
        if (insight?.suggestions && Array.isArray(insight.suggestions)) {
          return insight.suggestions
            .flatMap(suggestion => {
              if (!suggestion || typeof suggestion !== 'object') return [];
              const factors = suggestion.influencingFactors;
              // Use factors as secondary recommendations
              return Array.isArray(factors) ? factors.filter(factor => typeof factor === 'string') : [];
            })
            .slice(0, 5);
        }

        return [];
      } catch (error) {
        console.error('Error processing recommendations:', error);
        return [];
      }
    };

    const allRecommendations = getSafeRecommendations();

    if (!allRecommendations || allRecommendations.length === 0) return null;

    return (
      <View style={[styles.recommendationsCard, {
        borderLeftColor: config.iconColor,
      }]}>
        <View style={styles.recommendationsContainer}>
          <Text style={[styles.recommendationsTitle, { color: config.iconColor }]}>
            💡 Recommendations:
          </Text>
          {allRecommendations.map((rec, index) => {
            // Final safety check: ensure rec is a string before rendering
            const safeText = typeof rec === 'string' ? rec.trim() : 'Invalid recommendation data';

            return (
              <Text
                key={`rec-${index}`}
                style={[styles.recommendationItem, {
                  accessibilityLabel: `Recommendation ${index + 1}: ${safeText}`
                }]}
              >
                • {safeText}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSuggestion = () => {
    if (!suggestion) return null;

    return (
      <View style={[styles.suggestionContainer, {
        borderLeftColor: config.iconColor,
      }]}>
        <Text style={[styles.suggestionTitle, {
          color: config.iconColor,
        }]}>
          💡 AI Insight
        </Text>
        <Text style={styles.suggestionText} accessibilityLabel={`Suggestion: ${safeString(suggestion)}`}>
          {safeString(suggestion)}
        </Text>
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.sectionContainer}>
      {/* Standardized Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      </View>

      <Animated.View style={[{ opacity }, {
        ...styles.container,
        borderColor: displayConfig.borderColor,
        borderTopColor: displayConfig.borderColor + '80',
        padding: isLargeScreen ? 24 : 20,
      }]}>

        {/* Gradient overlay */}
        <View style={[styles.gradientOverlay, {
          backgroundColor: displayConfig.borderColor,
        }]} />

        {/* Main content container */}
        <View style={styles.contentContainer}>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {/* Title */}
            <Text style={[
              styles.title,
              {
                fontSize: isLargeScreen ? 20 : 18,
                fontWeight: '900',
                letterSpacing: -0.6
              }
            ]} accessibilityLabel={`Title: ${isEmpty ? "Waiting for Sensor Data" : safeString(title)}`}>
              {isEmpty ? "Waiting for Sensor Data" : safeString(title)}
            </Text>

            {/* Main content */}
            {renderContent()}

            {/* Recommendations */}
            {renderRecommendations()}

            {/* Status indicator */}
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.statusText} accessibilityLabel={`Content status: ${statusText}`}>
                {statusText}
              </Text>
            </View>

            {/* Last updated */}
            {lastUpdated && (
              <Text
                style={styles.lastUpdated}
                accessibilityLabel={`Last updated: ${new Date(lastUpdated).toLocaleString()}`}
              >
                Last updated: {new Date(lastUpdated).toLocaleTimeString("en-US", { hour12: true })}
              </Text>
            )}

            {/* Suggestion */}
            {renderSuggestion()}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Section styles
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
    alignItems: 'flex-start'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  // Typography styles
  title: {
    color: '#0f172a',
    marginBottom: 12,
    fontWeight: '700',
    letterSpacing: -0.025,
    lineHeight: 24,
  },
  description: {
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
    fontSize: 14,
    letterSpacing: 0.025,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Status and state styles
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
  },
  statusText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Loading styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Error styles
  errorText: {
    color: '#DC2626',
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
    borderLeftColor: '#6b7280',
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

  // Suggestion styles
  suggestionContainer: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6b7280', // Neutral gray as fallback
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    letterSpacing: 0.025,
  },
  suggestionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },

  // Utility button styles
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  }
});
