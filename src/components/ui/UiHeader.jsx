import { globalStyles } from "@styles/globalStyles.js";
import { useRouter } from "expo-router";
import { CloudRain, CloudSun, RefreshCw, Sun } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useWeather } from "../../contexts/WeatherContext";

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
  weather: propWeather,
  ...otherProps
}) {
  const router = useRouter();

  // Use weather from context, or fallback to prop if provided
  const { weather: contextWeather, isLoadingWeather, error: weatherError, refetchWeather } = useWeather();
  const weather = propWeather || contextWeather;

  // Ensure weather data is fresh when component mounts
  useEffect(() => {
    if (!propWeather && (weather.label === "Loading..." || weather.label === "Weather unavailable")) {
      refetchWeather();
    }
  }, [weather.label, propWeather, refetchWeather]);

  return (
    <View style={styles.container}>
      {/* PureFlow Logo */}
      <Image
        source={LOGO_PATH}
        style={[globalStyles.logo, style]}
        accessibilityLabel="pureflow_logo"
        {...otherProps}
      />

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
    maxWidth: 70,
    marginLeft: 20,
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
});
