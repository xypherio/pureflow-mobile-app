import { useNavigation } from '@react-navigation/native';
import {
  AlertCircle,
  Droplet,
  Gauge,
  Thermometer,
  Waves
} from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

// Icon and default color mapping
const parameterIcons = {
  ph: { icon: Gauge },
  temperature: { icon: Thermometer },
  tds: { icon: Droplet },
  salinity: { icon: Waves },
};

const NotificationCard = ({
  type = 'status',
  title,
  message,
  parameter = null, 
  alertLevel = { bg: '#F3F4F6', iconColor: '#007AFF' },
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = 'Go',
  secondaryLabel = 'Dismiss',
}) => {
  const navigation = useNavigation();

  const renderIcon = () => {
    if (parameter && parameterIcons[parameter]) {
      const IconComponent = parameterIcons[parameter].icon;
      return <IconComponent size={24} color={alertLevel.iconColor} />;
    }
    return <AlertCircle size={24} color="#FF3B30" />;
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
        <Text style={{ fontWeight: '600', fontSize: 16, color: '#111' }}>{title}</Text>
        <Text style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>{message}</Text>

        {/* Suggestion Buttons */}
        {type === 'suggestion' && (
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              onPress={onPrimaryAction}
              style={{
                backgroundColor: '#375996',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 24,
                marginRight: 8,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '500' }}>{primaryLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSecondaryAction}
              style={{
                borderColor: '#D1D5DB',
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 24,
              }}
            >
              <Text style={{ color: '#111827', fontWeight: '500' }}>{secondaryLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default NotificationCard;
