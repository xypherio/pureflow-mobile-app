import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import { Bell, FileText, Flame, Home } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

const TAB_ICON_SIZE = 22;

const _layout = () => {
  const insets = useSafeAreaInsets();

  // ⏳ Load Poppins font
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1c5c88" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarPressColor: "transparent",
        tabBarPressOpacity: 1,
        tabBarStyle: [
          tw`bg-white rounded-3xl h-18 absolute left-0 right-0 shadow-lg px-4`,
          {
            marginHorizontal: 16,
            marginBottom: 15 + insets.bottom,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: "midnightblue",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            paddingBottom: 10,
            paddingTop: 8,
          },
        ],
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 12,
        },
        tabBarActiveTintColor: "#007aff",
        tabBarInactiveTintColor: "#7f8c8d",
        tabBarIcon: ({ color }) => {
          let IconComponent;

          switch (route.name) {
            case "index":
              IconComponent = <Home size={TAB_ICON_SIZE} color={color} />;
              break;
            case "forecast":
              IconComponent = <Flame size={TAB_ICON_SIZE} color={color} />;
              break;
            case "report":
              IconComponent = <FileText size={TAB_ICON_SIZE} color={color} />;
              break;
            case "notifications":
              IconComponent = <Bell size={TAB_ICON_SIZE} color={color} />;
              break;
            default:
              IconComponent = <View />;
          }

          return IconComponent;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: "Forecast",
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
        }}
      />
    </Tabs>
  );
};

export default _layout;
