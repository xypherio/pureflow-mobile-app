import { useNavigation } from '@react-navigation/native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CloudRain,
  Droplet,
  Gauge,
  Info,
  Thermometer,
  Waves,
  XCircle
} from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Icon and default color mapping
const parameterIcons = {
  ph: { icon: Gauge, label: 'pH' },
  temperature: { icon: Thermometer, label: 'Temperature' },
  turbidity: { icon: Droplet, label: 'Turbidity' },
  salinity: { icon: Waves, label: 'Salinity' },
  rain: { icon: CloudRain, label: 'Rainy' },
};

const alertIcons = {
  "check-circle": CheckCircle,
  "alert-triangle": AlertTriangle,
  "x-circle": XCircle,
  "info": Info,
};

const NotificationCard = ({
  type = 'status',
  title,
  message,
  parameter = null,
  icon = null, // <-- Accept icon prop
  alertLevel = { bg: '#F3F4F6', iconColor: '#007AFF' },
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = 'Go',
  secondaryLabel = 'Dismiss',
}) => {
  const navigation = useNavigation();

  const renderIcon = () => {
    // 1. Use alert icon if provided
    if (icon && alertIcons[icon]) {
      const IconComponent = alertIcons[icon];
      return <IconComponent size={24} color={alertLevel.iconColor} />;
    }
    // 2. Use parameter icon if available
    if (parameter && parameterIcons[parameter.toLowerCase()]) {
      const IconComponent = parameterIcons[parameter.toLowerCase()].icon;
      return <IconComponent size={24} color={alertLevel.iconColor} />;
    }
    // 3. Fallback
    return <AlertCircle size={24} color={alertLevel.iconColor} />;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#1a2e51',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      {/* Icon container with dynamic background */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: alertLevel.bg,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        {renderIcon()}
      </View>

      {/* Texts */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          {parameter && parameterIcons[parameter.toLowerCase()] && (
            <View style={{ marginRight: 8 }}>
              {React.createElement(parameterIcons[parameter.toLowerCase()].icon, {
                size: 16,
                color: '#1E40AF' // Deep blue color
              }, null)}
            </View>
          )}
          <Text style={{ 
            fontWeight: '700', 
            fontSize: 14, 
            color: '#1E40AF', // Deep blue color
            textTransform: 'capitalize'
          }}>
            {parameter ? parameterIcons[parameter.toLowerCase()]?.label || parameter : ''}
          </Text>
        </View>
        <Text style={{ fontWeight: '600', fontSize: 16, color: '#111', marginBottom: 4 }}>{title}</Text>
        <Text style={{ fontSize: 14, color: '#4B5563' }}>{message}</Text>
      </View>
    </View>
  );
};

export default NotificationCard;
