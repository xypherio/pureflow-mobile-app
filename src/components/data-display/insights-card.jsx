import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { Text, View } from 'react-native';

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

export default function InsightsCard({ 
  type = 'info', 
  title, 
  description, 
  suggestion,
  action, 
  onActionPress,
  timestamp 
}) {
  const config = INSIGHT_TYPES[type] || INSIGHT_TYPES.info;
  const IconComponent = config.icon;

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      marginVertical: 5,
      borderWidth: 1,
      borderColor: config.borderColor,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient overlay */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: config.borderColor,
        opacity: 0.3,
      }} />
      
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: config.bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
          shadowColor: config.iconColor,
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}>
          <IconComponent
            size={24}
            color={config.iconColor}
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '800', 
            color: '#111827',
            marginBottom: 8,
            letterSpacing: -0.5,
          }}>
            {title}
          </Text>
          
          <Text style={{ 
            fontSize: 15, 
            color: '#4B5563',
            lineHeight: 22,
            marginBottom: 8,
            fontWeight: '400',
          }}>
            {description}
          </Text>
          
          {suggestion && (
            <View style={{
              backgroundColor: config.bgColor,
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
              borderLeftWidth: 3,
              borderLeftColor: config.iconColor,
            }}>
              <Text style={{
                fontSize: 13,
                color: config.iconColor,
                fontWeight: '600',
                marginBottom: 4,
              }}>
                💡 AI Suggestion
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#374151',
                lineHeight: 20,
                fontWeight: '500',
              }}>
                {suggestion}
              </Text>
            </View>
          )}
          
          {timestamp && (
            <Text style={{ 
              fontSize: 12, 
              color: '#9CA3AF',
              fontWeight: '500',
              fontStyle: 'italic',
              marginTop: 8,
            }}>
              {timestamp}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
} 