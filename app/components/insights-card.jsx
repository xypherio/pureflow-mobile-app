import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const INSIGHT_TYPES = {
  positive: {
    icon: CheckCircle,
    bgColor: '#D1FAE5',
    iconColor: '#059669',
    borderColor: '#10B981'
  },
  warning: {
    icon: AlertCircle,
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    borderColor: '#F59E0B'
  },
  critical: {
    icon: AlertTriangle,
    bgColor: '#FEE2E2',
    iconColor: '#DC2626',
    borderColor: '#EF4444'
  },
  info: {
    icon: Info,
    bgColor: '#DBEAFE',
    iconColor: '#2563EB',
    borderColor: '#3B82F6'
  }
};

export default function InsightsCard({ 
  type = 'info', 
  title, 
  description, 
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
      padding: 16,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: config.borderColor,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: config.bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <IconComponent
            size={20}
            color={config.iconColor}
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: 4
          }}>
            {title}
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#6B7280',
            lineHeight: 20,
            marginBottom: 8
          }}>
            {description}
          </Text>
          
          {action && (
            <TouchableOpacity
              onPress={onActionPress}
              style={{
                backgroundColor: config.iconColor,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ 
                color: '#fff', 
                fontWeight: '600',
                fontSize: 12
              }}>
                {action}
              </Text>
            </TouchableOpacity>
          )}
          
          {timestamp && (
            <Text style={{ 
              fontSize: 12, 
              color: '#9CA3AF',
              marginTop: 8
            }}>
              {timestamp}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
} 