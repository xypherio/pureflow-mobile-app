import { globalStyles } from "@styles/globalStyles.js";
import { useRouter } from "expo-router";
import { CloudRain, CloudSun, RefreshCw, Sun } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { weatherService } from "../../services/weatherService";

const LOGO_PATH = require("../../../assets/logo/pureflow-logo.png");

const shortenWeatherLabel = (label) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel === 'clear sky') return 'Clear';
  if (lowerLabel === 'few clouds') return 'Few';
  if (lowerLabel === 'scattered clouds') return 'Scattered';
  if (lowerLabel === 'broken clouds') return 'Broken';
  if (lowerLabel === 'overcast clouds') return 'Cloudy';
  if (lowerLabel.includes('rain')) return 'Rain';
  if (lowerLabel.includes('thunderstorm')) return 'Thunder';
  if (lowerLabel.includes('snow')) return 'Snow';
  if (lowerLabel.includes('mist')) return 'Mist';
  if (lowerLabel.includes('fog')) return 'Fog';
  // Default: capitalize first word
  const words = label.split(' ');
  const first = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return first.length > 9 ? first.substring(0, 9) : first;
};

const weatherIconMap = {
  rain: <CloudRain size={24} color="#3b82f6" />,
  sunny: <Sun size={24} color="#fbbf24" />,
  partly: <CloudSun size={24} color="#facc15" />,
};

export default function PureFlowLogo({
  style,
  ...props
}) {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [weather, setWeather] = useState({
    label: "Loading...",
    temp: "--°C",
    icon: "partly"
  });
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    setWeatherError(false);
    
    try {
      // You can also use coordinates if you have location permissions
      // const weatherData = await weatherService.getCurrentWeather(10.3157, 123.9223); // Mandaue coordinates
      const weatherData = await weatherService.getCurrentWeatherByCity('Bogo City');
      setWeather(weatherData);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeatherError(true);
      setWeather({
        label: "Weather unavailable",
        temp: "--°C",
        icon: "partly"
      });
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <View style={styles.container}>
      {/* PureFlow Logo */}
      <Pressable onPress={() => setModalVisible(true)}>
        <Image
          source={LOGO_PATH}
          style={[globalStyles.logo, style]}
          accessibilityLabel="pureflow_logo"
          {...props}
        />
      </Pressable>

      {/* Weather Info */}
      <Pressable 
        style={styles.weatherContainer}
        onPress={() => router.push('/forecast')}
      >
        {isLoadingWeather ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : weatherError ? (
          <RefreshCw size={20} color="#ef4444" />
        ) : (
          weatherIconMap[weather.icon] || (
            <CloudRain size={24} color="#3b82f6" />
          )
        )}
        
        <View style={styles.weatherTextContainer}>
          <Text style={styles.weatherLabel} numberOfLines={1}>
            {shortenWeatherLabel(weather.label)}
          </Text>
          <Text style={styles.weatherTemp}>
            {weather.temp}
          </Text>
        </View>
      </Pressable>

      {/* App Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalDescription}>
              PureFlow is a water quality monitoring system that utilizes IoT devices to track and analyze water parameters in real-time. It leverages AI to provide insights and recommendations based on real-time sensor data. Stay informed about your water quality with ease.
            </Text>
            {weather.city && (
              <Text style={styles.modalWeatherInfo}>
                Current weather in {weather.city}: {weather.label}, {weather.temp}
                {weather.humidity && ` • Humidity: ${weather.humidity}%`}
              </Text>
            )}
            <Text style={styles.modalCopyright}>
              © {new Date().getFullYear()} PureFlow. All rights reserved.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 30,
    backgroundColor: "#e5f0f9",
    zIndex: 9999,
  },
  weatherContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 60,
  },
  weatherTextContainer: {
    flex: 1,
  },
  weatherLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    textTransform: "capitalize",
  },
  weatherTemp: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  weatherCity: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(48, 76, 120, 0.3)',
    zIndex: 999,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#e5f0f9',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'left',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalWeatherInfo: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalCopyright: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
});
