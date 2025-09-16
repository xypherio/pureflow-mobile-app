import { DataProvider } from "@contexts/DataContext";
import { InsightsProvider } from "@contexts/InsightsContext";
import { NotificationProvider } from "@contexts/NotificationContext"; // 👈 ADD THIS LINE
import { SuggestionProvider } from "@contexts/SuggestionContext";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import SplashScreenComponent from "@ui/SplashScreen";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, StyleSheet } from "react-native";

// Suppress React Native Web warnings
if (typeof window !== "undefined") {
  LogBox.ignoreLogs([
    "Invalid DOM property `transform-origin`. Did you mean `transformOrigin`?",
    "Unknown event handler property `onStartShouldSetResponder`. It will be ignored.",
    "Unknown event handler property `onResponderTerminationRequest`. It will be ignored.",
    "Unknown event handler property `onResponderGrant`. It will be ignored.",
    "Unknown event handler property `onResponderMove`. It will be ignored.",
    "Unknown event handler property `onResponderRelease`. It will be ignored.",
    "Unknown event handler property `onResponderTerminate`. It will be ignored.",
  ]);
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [preloadedData, setPreloadedData] = useState(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    // Hide splash screen when fonts are loaded
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }

    // Clean up listeners on unmount
    return () => {

    };
  }, [fontsLoaded]);

  const handleDataLoaded = async (data) => {
    try {
      console.log("✅ Data preloading completed:", {
        sensorDataCount: data.sensorData?.length || 0,
        alertsCount: data.alerts?.length || 0,
        fromCache: data.fromCache,
        loadTime: data.loadTime,
      });

      setPreloadedData(data);

      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsAppReady(true);
    } catch (error) {
      console.error("Error handling preloaded data:", error);
      // Continue anyway to prevent app from being stuck
      setIsAppReady(true);
    }
  };

  // Show custom splash screen while loading fonts and data
  if (!fontsLoaded || !isAppReady) {
    return <SplashScreenComponent onDataLoaded={handleDataLoaded} />;
  }

  return (
    <NotificationProvider>
      {" "}
      <InsightsProvider>
        <DataProvider initialData={preloadedData}>
          <SuggestionProvider>
            <Stack>
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
          </SuggestionProvider>
        </DataProvider>
      </InsightsProvider>
    </NotificationProvider>
  );
}
