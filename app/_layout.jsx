import { DataProvider } from "@contexts/DataContext";
import { InsightsProvider } from "@contexts/InsightsContext";
import { NotificationProvider } from "@contexts/NotificationContext";
import { OptimizedDataProvider } from "@contexts/OptimizedDataContext";
import { SuggestionProvider } from "@contexts/SuggestionContext";
import {
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    useFonts,
} from "@expo-google-fonts/poppins";
import { initializeServices } from '@services/ServiceContainer';
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
  const [servicesReady, setServicesReady] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [preloadedData, setPreloadedData] = useState(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    let isMounted = true;

    async function prepareApp() {
      try {
        console.log('🔧 Initializing application services...');
        // Initialize all application services
        await initializeServices();
        console.log('✅ All services initialized, app is ready to launch.');
        if (isMounted) {
          setServicesReady(true);
        }
      } catch (e) {
        console.error('❌ Failed to initialize app services', e);
        // Set services as ready anyway to prevent app from being stuck
        if (isMounted) {
          setServicesReady(true);
        }
      } finally {
        // The splash screen component will handle data loading and transitions
        if (fontsLoaded && isMounted) {
          SplashScreen.hideAsync();
        }
      }
    }

    prepareApp();

    return () => {
      isMounted = false;
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
    return <SplashScreenComponent onDataLoaded={handleDataLoaded} servicesReady={servicesReady} />;
  }

  return (
    <NotificationProvider>
      <InsightsProvider>
        <OptimizedDataProvider>
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
        </OptimizedDataProvider>
      </InsightsProvider>
    </NotificationProvider>
  );
}
