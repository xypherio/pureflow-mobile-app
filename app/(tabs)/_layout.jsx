import { Tabs } from "expo-router";
import { Bell, FileText, Flame, Home } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

const TAB_ICON_SIZE = 22;

const _layout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          tw`bg-white rounded-3xl h-18 absolute left-0 right-0 shadow-lg px-4`,
          {
            marginHorizontal: 16,
            marginBottom: 24 + insets.bottom,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            paddingBottom: 10,
            paddingTop: 8,
          },
        ],
        tabBarLabelStyle: tw`text-xs mt-0.5`,
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
