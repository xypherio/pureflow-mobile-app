import { DataProvider } from "@contexts/DataContext";
import { InsightsProvider } from "@contexts/InsightsContext";
import { NotificationProvider } from "@contexts/NotificationContext";
import { OptimizedDataProvider } from "@contexts/OptimizedDataContext";
import { SuggestionProvider } from "@contexts/SuggestionContext";
import { WeatherProvider } from "@contexts/WeatherContext";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { initializeServices } from '@services/ServiceContainer';
import SplashScreenComponent from "@ui/SplashScreen";
import { Stack } from "expo-router";
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
    let initializationTimeout;

    async function prepareApp() {
      const startTime = Date.now();
      console.log('🚀 Starting app preparation...');



      try {
        console.log('🔧 Initializing application services...');

        // Add timeout protection for service initialization
        const serviceInitPromise = initializeServices();
        const timeoutPromise = new Promise((_, reject) => {
          initializationTimeout = setTimeout(() => {
            reject(new Error('Service initialization timed out after 30 seconds'));
          }, 30000); // 30 second timeout
        });

        await Promise.race([serviceInitPromise, timeoutPromise]);
        clearTimeout(initializationTimeout);

        const serviceInitTime = Date.now() - startTime;
        console.log(`✅ All services initialized successfully in ${serviceInitTime}ms, app is ready to launch.`);

        if (isMounted) {
          setServicesReady(true);
        }
      } catch (e) {
        clearTimeout(initializationTimeout);
        const failTime = Date.now() - startTime;
        console.error(`❌ Failed to initialize app services after ${failTime}ms:`, e);

        // Determine if this is a critical failure or can continue with limited functionality
        const isCriticalError = (
          e.message?.includes('Service initialization timed out') ||
          e.message?.includes('Firebase config') ||
          e.message?.includes('Not a physical device')
        );

        if (isCriticalError) {
          console.warn('🚨 Critical initialization error detected - some features may not work');
        }

        // Always set servicesReady to true to prevent app from being stuck
        // The app will continue with whatever services did initialize successfully
        if (isMounted) {
          setServicesReady(true);
        }
      } finally {
        // Services initialization completed
      }
    }

    prepareApp();

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
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

  // Show custom splash screen while data is loading
  if (!isAppReady) {
    return <SplashScreenComponent onDataLoaded={handleDataLoaded} servicesReady={servicesReady} />;
  }

  return (
    <WeatherProvider>
      <NotificationProvider>
        <InsightsProvider>
          <OptimizedDataProvider servicesReady={servicesReady}>
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
    </WeatherProvider>
  );
}
