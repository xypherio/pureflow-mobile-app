import { Droplet, Gauge, Thermometer, Waves } from 'lucide-react-native';
import { Image, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

const LOGO_PATH = require('../../assets/images/pureflow-logo-1.png');

const parameters = [
  {
    label: 'pH Level',
    value: '7.2',
    unit: 'pH',
    icon: <Droplet size={40} color="#007bff" />,
  },
  {
    label: 'Temperature',
    value: '25',
    unit: '°C',
    icon: <Thermometer size={40} color="#e83e8c" />,
  },
  {
    label: 'TDS',
    value: '500',
    unit: 'ppm',
    icon: <Gauge size={40} color="#28a745" />,
  },
  {
    label: 'Salinity',
    value: '35',
    unit: 'ppt',
    icon: <Waves size={40} color="#17a2b8" />,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-[#e6fbff]">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 110,
          paddingTop: insets.top + 8,
        }}
        className="px-4"
      >
        {/* Header Logo */}
        <View className="mb-4 items-start">
          <Image
            source={LOGO_PATH}
            style={globalStyles.logo}
            accessibilityLabel="app_logo"
          />
        </View>

        {/* Top Card Placeholder */}
        <View className="h-16 bg-white rounded-xl mb-4 shadow" />

        {/* Real-Time Data */}
        <View>
          <Text className="text-xs text-gray-500 mb-2">Real-Time Data</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            {parameters.map((param, i) => (
              <View
                key={i}
                style={{
                  width: '48%',
                  minWidth: 150, // optional: set a min width for small screens
                  marginBottom: 16,
                }}
                className="h-32 bg-white rounded-2xl shadow p-4 justify-between"
              >
                <View className="flex-row items-center space-x-3">
                  {param.icon}
                  <Text className="text-4xl font-bold text-gray-700">
                    {param.value}
                  </Text>
                </View>
                <View className="pl-1">
                  <Text className="text-base text-gray-500 mt-1">{param.unit}</Text>
                  <Text className="text-sm text-gray-400 mt-0.5">{param.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <Text className="text-xs text-gray-500 mb-2">Daily Trends</Text>
        <View className="h-60 bg-white rounded-xl shadow p-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
