import { Text, View } from 'react-native';

export default function ForecastLineChart() {
  return (
    <View
      style={{
        backgroundColor: '#f6fafd',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        height: 250,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#1f2937', // gray-800
        }}
      >
        Forecasted Chart
      </Text>

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            height: 180,
            backgroundColor: '#f0f8fe',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: '#224882',
            borderRadius: 12,
          }}
        />
      </View>
    </View>
  );
}
