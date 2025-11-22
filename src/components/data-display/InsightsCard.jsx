import { useInsights } from '@contexts/InsightsContext';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Environment check for production
const isProduction = __DEV__ === false;

/**
 * Silent logging that only shows in development
 */
const silentLog = (message, ...args) => {
  if (!isProduction) {
    console.log(message, ...args);
  }
};

/**
 * Silent error logging that only shows in development
 */
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
  action, 
  onActionPress,
  timestamp,
  sensorData,
  componentId = 'insights-card',
  autoRefresh = true
}) {
  const { 
    generateComponentInsight, 
    getComponentInsight, 
    isComponentLoading, 
    getComponentError 
  } = useInsights();
  
  const [insight, setInsight] = useState(description);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.info;
  const IconComponent = config.icon;
  const loading = isComponentLoading(componentId);
  const error = getComponentError(componentId);
  const cachedInsight = getComponentInsight(componentId);

  // Use cached insight if available, otherwise use description prop
  const currentInsight = cachedInsight?.insights?.overallInsight || insight;
  const lastUpdated = cachedInsight?.lastUpdated || timestamp;
  const insightSource = cachedInsight?.insights?.source || 'prop';

  useEffect(() => {
    if (sensorData && autoRefresh) {
      generateComponentInsight(componentId, sensorData).catch(error => {
        silentError(`Failed to generate insight for ${componentId}:`, error);
      });
    }
  }, [sensorData, componentId, autoRefresh, generateComponentInsight]);

  // Update local insight when cached insight changes
  useEffect(() => {
    if (cachedInsight) {
      setInsight(cachedInsight.insights?.overallInsight || description);
    }
  }, [cachedInsight, description]);

  const handleRefresh = async () => {
    if (!sensorData) {
      silentLog(`No sensor data available for refresh of ${componentId}`);
      return;
    }

    setIsRefreshing(true);
    try {
      await generateComponentInsight(componentId, sensorData, true);
      silentLog(`✅ Successfully refreshed insight for ${componentId}`);
    } catch (error) {
      silentError(`Failed to refresh insight for ${componentId}:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (loading || isRefreshing) return '#3B82F6'; // Blue for loading
    if (error) return '#EF4444'; // Red for error
    if (insightSource === 'cached-fallback') return '#F59E0B'; // Orange for cached fallback
    if (insightSource === 'gemini-ai') return '#10B981'; // Green for fresh AI data
    return '#6B7280'; // Gray for default
  };

  const getStatusText = () => {
    if (loading || isRefreshing) return 'Generating insight...';
    if (error) return 'Error loading insight';
    if (insightSource === 'cached-fallback') return 'Using cached data';
    if (insightSource === 'gemini-ai') return 'AI Generated';
    return 'Static content';
  };

  // Check if we should show empty state
  const isEmpty = !loading && !error && (!currentInsight || currentInsight === "No data available");

  // Determine which config to use - empty state if no data
  const displayConfig = isEmpty ? INSIGHT_TYPES.empty : config;

  // User-friendly error message
  const getErrorMessage = () => {
    if (!error) return null;

    // Convert technical errors to user-friendly messages
    if (error.includes('quota') || error.includes('limit')) {
      return 'AI service quota exceeded. Please try again later.';
    }
    if (error.includes('network') || error.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (error.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    return 'Unable to generate insight at this time.';
  };

  // Prepare content based on state
  const renderContent = () => {
    if (loading) {
      return <Text style={styles.loadingText}>Generating AI insight...</Text>;
    }

    if (error) {
      return <Text style={[styles.loadingText, { color: '#EF4444' }]}>{getErrorMessage()}</Text>;
    }

    if (isEmpty) {
      return <Text style={styles.description}>"Insights will be available once your water quality sensors start collecting data and our AI analyzes the trends."</Text>;
    }

    return <Text style={styles.description}>{safeString(currentInsight)}</Text>;
  };

  return (
    <View style={[styles.container, {
      borderColor: displayConfig.borderColor,
    }]}>
      {/* Gradient overlay */}
      <View style={[styles.gradientOverlay, {
        backgroundColor: displayConfig.borderColor,
      }]} />

      <View style={styles.contentContainer}>
        <View style={[styles.iconContainer, {
          backgroundColor: displayConfig.bgColor,
          shadowColor: displayConfig.iconColor,
        }]}>
          <IconComponent
            size={isEmpty ? 20 : 24}
            color={displayConfig.iconColor}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isEmpty ? "Waiting for Sensor Data" : safeString(title)}
          </Text>

          {renderContent()}

          {/* Status indicator */}
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>
              {getStatusText()}
            </Text>
          </View>
          
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
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
              <Text style={styles.suggestionText}>
                {safeString(suggestion)}
              </Text>
            </View>
          )}

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  contentContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  description: { 
    fontSize: 15, 
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '400',
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
  }
});
