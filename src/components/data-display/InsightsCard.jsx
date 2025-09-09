import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const safeString = (value) => {
  if (value === null || value === undefined) {
    return "No data available";
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};
import { generateInsight } from '../../services/ai/geminiAPI';

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
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
  }
});

export default function InsightsCard({ 
  type = 'info', 
  title, 
  description, 
  suggestion,
  action, 
  onActionPress,
  timestamp,
  sensorData
}) {
  const [insight, setInsight] = useState(description);
  const [loading, setLoading] = useState(false);
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.info;
  const IconComponent = config.icon;

  useEffect(() => {
    const fetchInsight = async () => {
      if (sensorData) {
        setLoading(true);
        const generatedInsight = await generateInsight(sensorData);
        setInsight(generatedInsight);
        setLoading(false);
      }
    };

    fetchInsight();
  }, [sensorData]);

  return (
    <View style={[styles.container, {
      borderColor: config.borderColor,
    }]}>
      {/* Gradient overlay */}
      <View style={[styles.gradientOverlay, {
        backgroundColor: config.borderColor,
      }]} />
      
      <View style={styles.contentContainer}>
        <View style={[styles.iconContainer, {
          backgroundColor: config.bgColor,
          shadowColor: config.iconColor,
        }]}>
          <IconComponent
            size={24}
            color={config.iconColor}
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {safeString(title)}
          </Text>
          
          <Text style={styles.description}>
            {loading ? 'Generating insight...' : safeString(insight?.overallInsight || '')}
          </Text>
           <Text style={styles.lastUpdated}>
                Last updated: {new Date().toLocaleString()}
              </Text>
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
