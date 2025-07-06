import { View, Text } from 'react-native';
import { Info, AlertTriangle, Lightbulb } from 'lucide-react-native';

export default function ForecastInsights({ message, type = 'info' }) {
  // Icon and color themes
  const themes = {
    info: {
      bgColor: '#fefce8',
      borderColor: '#facc15',
      textColor: '#78350f',
      icon: <Info size={24} color="#ca8a04" />,
    },
    warning: {
      bgColor: '#fff7ed',
      borderColor: '#fb923c',
      textColor: '#7c2d12',
      icon: <AlertTriangle size={24} color="#ea580c" />,
    },
    suggestion: {
      bgColor: '#ecfdf5',
      borderColor: '#34d399',
      textColor: '#065f46',
      icon: <Lightbulb size={24} color="#10b981" />,
    },
  };

  const { bgColor, borderColor, textColor, icon } = themes[type] || themes.info;

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 16,
        padding: 18,
        marginTop: 16,
        marginBottom: 12,
        borderLeftWidth: 5,
        borderLeftColor: borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        {icon}
        <Text
          style={{
            marginLeft: 10,
            fontSize: 17,
            fontWeight: '700',
            color: textColor,
          }}
        >
          Forecast Insight
        </Text>
      </View>

      {/* Main Insight Message */}
      <Text
        style={{
          fontSize: 15,
          color: textColor,
          lineHeight: 22,
          fontWeight: '500',
        }}
      >
        {message || 'No significant forecast risks detected. All systems are stable for now.'}
      </Text>
    </View>
  );
}
