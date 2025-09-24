import { getDashboardFacade } from '@services/ServiceContainer';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onDataLoaded, servicesReady }) {
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    if (servicesReady) {
      // Start data preloading only when services are ready
      preloadAppData();
    }
  }, [servicesReady, onDataLoaded]);

  const preloadAppData = async () => {
    try {
      setLoadingText('Loading sensor data...');
      setProgress(25);

      // Preload dashboard data
      const dashboardData = await getDashboardFacade().getDashboardData({
        includeHistorical: true,
        useCache: true
      });

      setLoadingText('Processing alerts...');
      setProgress(50);

      // The data structure is different, so update accordingly
      const data = {
        sensorData: dashboardData.today.data,
        alerts: dashboardData.alerts.active,
        dailyReport: dashboardData.current,
        historicalAlerts: { sections: [], totalCount: 0 }, // If needed, fetch separately
        fromCache: dashboardData.metadata.fromCache
      };

      setLoadingText('Finalizing...');
      setProgress(75);

      // Call the callback to indicate data is loaded
      if (onDataLoaded) {
        onDataLoaded(data);
      }

      setProgress(100);

    } catch (error) {
      console.error('Error preloading app data:', error);
      // Even if there's an error, try to continue
      if (onDataLoaded) {
        onDataLoaded(null);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Logo/App Name */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo/SPLASH-01.png')}
              style={styles.logoImage}
            />
          </View>

          {/* Loading Indicator */}
          <View style={styles.loadingContainer}>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: `${progress}%`,
                  }
                ]}
              />
            </View>

            <Text style={styles.loadingText}>
              {loadingText}
            </Text>
          </View>

        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002d66',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#e8f2ff',
    textAlign: 'center',
  },
});
