import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

// Environment check for production
const isProduction = __DEV__ === false;

const silentLog = (message, ...args) => {
  if (!isProduction) {
    console.log(message, ...args);
  }
};

const silentError = (message, error) => {
  if (!isProduction) {
    console.error(message, error);
  }
};

const safeString = (value) => {
  if (value === null || value === undefined) {
    return "No data available";
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

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
  autoRefresh = true
}) {
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.info;
  const IconComponent = config.icon;
  const currentInsight = description || "No insights available";
  const lastUpdated = timestamp || new Date();
  const insightSource = 'static';

  const { width } = Dimensions.get('window');
  const isLargeScreen = width > 500;

  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const getStatusColor = () => {
    return '#6B7280'; // Gray for static content
  };

  const getStatusText = () => {
    return 'Content available';
  };

  // Check if we should show empty state
  const isEmpty = !currentInsight || currentInsight === "No insights available";

  // Determine which config to use - empty state if no data
  const displayConfig = isEmpty ? INSIGHT_TYPES.empty : config;

  // Prepare content based on state
  const renderContent = () => {
    if (isEmpty) {
      return <Text style={styles.description} accessibilityLabel="Empty state message">{"Insights will be available once your water quality sensors start collecting data and our AI analyzes the trends."}</Text>;
    }

    return <Text style={styles.description} accessibilityLabel={"Description: " + safeString(currentInsight)}>{safeString(currentInsight)}</Text>;
  };

  return (
    <Animated.View style={[{ opacity }, {
      ...styles.container,
      borderColor: displayConfig.borderColor,
      padding: isLargeScreen ? 24 : 20,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    }]}>
      {/* Gradient overlay */}
      <View style={[styles.gradientOverlay, {
        backgroundColor: displayConfig.borderColor,
      }]} />

      <View style={styles.contentContainer}>
        <View style={[styles.iconContainer, {
          backgroundColor: displayConfig.bgColor,
          shadowColor: displayConfig.iconColor,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }]}>
          <IconComponent
            size={isEmpty ? 20 : 24}
            color={displayConfig.iconColor}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: isLargeScreen ? 20 : 18, fontWeight: '900', letterSpacing: -0.6 }]} accessibilityLabel={"Title: " + (isEmpty ? "Waiting for Sensor Data" : safeString(title))}>
            {isEmpty ? "Waiting for Sensor Data" : safeString(title)}
          </Text>

          {renderContent()}

          {recommendations && recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
              {recommendations.map((rec, index) => (
                <Text key={index} style={[styles.recommendationItem, { accessibilityLabel: `Recommendation: ${rec}` }]}>• {rec}</Text>
              ))}
            </View>
          )}

          {/* Status indicator */}
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText} accessibilityLabel="Content status: Content available">
              {getStatusText()}
            </Text>
          </View>

          {lastUpdated && (
            <Text style={styles.lastUpdated} accessibilityLabel={"Last updated: " + new Date(lastUpdated).toLocaleString()}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </Text>
          )}

          {suggestion && (
            <View style={[styles.suggestionContainer, {
              backgroundColor: config.bgColor,
              borderLeftColor: config.iconColor,
            }]}>
              <Text style={[styles.suggestionTitle, {
                color: config.iconColor,
              }]}>
                💡 AI Suggestion
              </Text>
              <Text style={styles.suggestionText} accessibilityLabel={"Suggestion: " + safeString(suggestion)}>
                {safeString(suggestion)}
              </Text>
            </View>
          )}

        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginVertical: 5,
    borderWidth: 1,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  title: {
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: '500',
    fontSize: 15,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 8,
  },
  suggestionContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  recommendationsContainer: {
    marginTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginLeft: 8,
  }
});
