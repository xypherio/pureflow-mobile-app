import { Tabs } from "expo-router";
import { Bell, FileText, Flame, Home } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

const TAB_ICON_SIZE = 22;

const _layout = () => {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          marginHorizontal: 16,
          marginBottom: 24,
          borderRadius: 24,
          height: 70,
          position: "absolute",
          left: 0,
          right: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 8, // for Android
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
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
