import { CloudRain, CloudSun, RefreshCw, Sun } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { weatherService } from "../../services/weatherService";

const weatherIconMap = {
  rain: <CloudRain size={24} color="#3b82f6" />,
  sunny: <Sun size={24} color="#fbbf24" />,
  partly: <CloudSun size={24} color="#facc15" />,
};

/**
 * WeatherBadge component for displaying current weather information
 * Handles weather fetching and refreshing independently
 */
const WeatherBadge = React.memo(() => {
  const [weather, setWeather] = useState({
    label: "Loading...",
    temp: "--°C",
    icon: "partly"
  });
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const fetchWeather = React.useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchWeather();

    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

  const handleWeatherRefresh = React.useCallback(() => {
    if (!isLoadingWeather) {
      fetchWeather();
    }
  }, [isLoadingWeather, fetchWeather]);

  return (
    <Pressable
      style={styles.weatherContainer}
      onPress={handleWeatherRefresh}
      disabled={isLoadingWeather}
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
          {weather.label}
        </Text>
        <Text style={styles.weatherTemp}>
          {weather.temp}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  weatherContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 100,
  },
  weatherTextContainer: {
    marginLeft: 8,
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
});

export default WeatherBadge;
