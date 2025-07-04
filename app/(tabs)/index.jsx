import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import { Image, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

const LOGO_PATH = require("../../assets/images/pureflow-logo-1.png");

const parameters = [
  {
    label: "pH Level",
    value: "7.2",
    unit: "pH",
    icon: <Droplet size={30} color="#007bff" />,
    color: "#007bff",
  },
  {
    label: "Temperature",
    value: "25",
    unit: "°C",
    icon: <Thermometer size={30} color="#e83e8c" />,
    color: "#e83e8c",
  },
  {
    label: "TDS",
    value: "500",
    unit: "ppm",
    icon: <Gauge size={30} color="#28a745" />,
    color: "#28a745",
  },
  {
    label: "Salinity",
    value: "35",
    unit: "ppt",
    icon: <Waves size={30} color="#17a2b8" />,
    color: "#17a2b8",
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

        <View>
          <Text className="text-xs text-gray-500 mb-2">Real-Time Data</Text>

          {/* Outer Large Box */}
          <View
            className="rounded-2xl p-4 mb-6"
            style={{ backgroundColor: "#224882" }}
          >
            {/* Grid Container */}
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {parameters.map((param, i) => (
                <View
                  key={i}
                  className="bg-white rounded-xl p-3 justify-between"
                  style={{
                    width: "48%",
                    minWidth: 120,
                    height: 150,
                  }}
                >
                  <View className="flex-col items-start space-y-2">
                    {param.icon}
                    <View className="flex-row items-baseline space-x-2">
                      <Text
                        className="text-6xl font-bold"
                        style={{ color: param.color }}
                      >
                        {param.value}
                      </Text>
                      <Text
                        className="text-2xl font-bold"
                        style={{ color: param.color }}
                      >
                        {param.unit}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-2 pl-1">
                    <Text className="text-1x1 text-pureflow-lightblue">
                      {param.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text className="text-xs text-gray-500 mb-2">Daily Trends</Text>
        <View
          className="h-[11.5rem] bg-white rounded-xl p-4 justify-center mb-7"
          style={globalStyles.boxShadow}
        >
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
