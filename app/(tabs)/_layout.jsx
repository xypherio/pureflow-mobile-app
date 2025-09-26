import { colors } from "@styles/globalStyles";
import { Tabs } from "expo-router";
import { Bell, FileText, Flame, Home } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICON_SIZE = 22;

const TabsLayout = () => {
  const insets = useSafeAreaInsets();
  const isLoading = false;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1c5c88" />
      </View>
    );
  }

  const screenOptions = {
    headerShown: false,
    tabBarShowLabel: true,
    tabBarPressColor: "transparent",
    tabBarPressOpacity: 1,
    tabBarStyle: [styles.tabBar, { marginBottom: 10 + insets.bottom }],
    tabBarLabelStyle: styles.tabBarLabel,
    tabBarActiveTintColor: "#2569d0",
    tabBarInactiveTintColor: colors.textMuted,
  };

  const getTabBarIcon = (route, color) => {
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
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ color }) => getTabBarIcon(route, color),
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{
          title: "Home",
          tabBarTestID: 'home-tab',
        }} 
      />
      <Tabs.Screen 
        name="forecast" 
        options={{
          title: "Forecast",
          tabBarTestID: 'forecast-tab',
        }} 
      />
      <Tabs.Screen 
        name="report" 
        options={{
          title: "Report",
          tabBarTestID: 'report-tab',
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{
          title: "Alerts",
          tabBarTestID: 'alerts-tab',
          tabBarBadge: 3, // Example badge
        }} 
      />
    </Tabs>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  tabBar: {
    backgroundColor: "#fff",
    borderRadius: 22,
    height: 70,
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