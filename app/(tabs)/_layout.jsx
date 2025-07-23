import { Tabs } from "expo-router";
import { Bell, FileText, Flame, Home } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICON_SIZE = 22;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  tabBar: {
    backgroundColor: "#fff",
    borderRadius: 24,
    height: 72,
    position: "absolute",
    left: 0,
    right: 0,
    marginHorizontal: 16,
    marginBottom: 5,
    borderTopWidth: 0,
    paddingBottom: 10,
    paddingTop: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  tabBarLabel: {
    fontSize: 12,
  },
});

const _layout = () => {
  const insets = useSafeAreaInsets();

  const isLoading = false;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
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
        tabBarStyle: [styles.tabBar, { marginBottom: 5 + insets.bottom }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: "#007aff",
        tabBarInactiveTintColor: "#7f8c8d",
        tabBarIcon: ({ color }) => {
          switch (route.name) {
            case "index":
              return <Home size={TAB_ICON_SIZE} color={color} />;
            case "forecast":
              return <Flame size={TAB_ICON_SIZE} color={color} />;
            case "report":
              return <FileText size={TAB_ICON_SIZE} color={color} />;
            case "notifications":
              return <Bell size={TAB_ICON_SIZE} color={color} />;
            default:
              return <View />;
          }
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="forecast" options={{ title: "Forecast" }} />
      <Tabs.Screen name="report" options={{ title: "Report" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
    </Tabs>
  );
};

export default _layout;
