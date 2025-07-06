import { useNavigation } from '@react-navigation/native';
import {
  AlertCircle,
  Droplet,
  Gauge,
  Thermometer,
  Waves,
  X,
} from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

// Icon and color mapping
const parameterIcons = {
  ph: { icon: Gauge, color: '#007bff' },
  temperature: { icon: Thermometer, color: '#e83e8c' },
  tds: { icon: Droplet, color: '#28a745' },
  salinity: { icon: Waves, color: '#17a2b8' },
};

const NotificationCard = ({
  type = 'status', // 'status' or 'suggestion'
  title,
  message,
  parameter = null, // 'ph', 'temperature', 'tds', 'salinity'
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = 'Go',
  secondaryLabel = 'Dismiss',
}) => {
  const navigation = useNavigation();

  const renderIcon = () => {
    if (parameter && parameterIcons[parameter]) {
      const { icon: IconComponent, color } = parameterIcons[parameter];
      return <IconComponent size={24} color={color} />;
    }
    return <AlertCircle size={24} color="#FF3B30" />;
  };

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 3,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}>
      {/* Icon */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        {renderIcon()}
      </View>

      {/* Texts */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', fontSize: 16, color: '#111' }}>{title}</Text>
        <Text style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>{message}</Text>

        {type === 'suggestion' && (
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              onPress={onPrimaryAction}
              style={{
                backgroundColor: '#FF6B00',
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

      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={{ marginLeft: 8 }}>
        <X size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
};

export default NotificationCard;
