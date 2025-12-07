import React, {
  useMemo,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useWeather } from "../../contexts/WeatherContext";

// Weather Icon Component
const WeatherIcon = ({ condition, size = 50 }) => {
  const diameterStyle = { width: size, height: size, borderRadius: size / 2 };

  const renderIcon = (emoji, containerVariant, textVariant) => (
    <View style={[styles.iconBase, styles[containerVariant], diameterStyle]}>
      <Text style={[styles.iconText, styles[textVariant], { fontSize: size * 0.6 }]}>
        {emoji}
      </Text>
    </View>
  );

  switch ((condition || "").toLowerCase()) {
    case "sunny":
    case "clear":
      return renderIcon("☀️", "iconSunny", "iconSunnyText");
    case "partly":
    case "clouds":
      return renderIcon("⛅", "iconClouds", "iconCloudsText");
    case "rain":
    case "drizzle":
      return renderIcon("🌧️", "iconRain", "iconRainText");
    case "thunderstorm":
      return renderIcon("⛈️", "iconThunder", "iconThunderText");
    default:
      return renderIcon("🌤️", "iconDefault", "iconDefaultText");
  }
};

const formatWindSpeed = (speed) => {
  if (!speed) return "N/A";
  return `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
};

const getWindDirection = (deg) => {
  if (deg === null || deg === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(deg / 45) % 8];
};

const getCurrentDateTime = () => {
  const now = new Date();
  const options = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return now.toLocaleDateString("en-US", options);
};

export default function WeatherBanner({
  forecast: propForecast,
  showCurrentWeather = false,
  city = "Bogo City",
}) {
  const { currentWeather, isLoadingWeather, error } = useWeather();

  // Memoize compact weather data
  const compactWeatherData = useMemo(() => {
    if (isLoadingWeather || error || !currentWeather) {
      return null;
    }

    return {
      temperature: currentWeather.temp.replace("°C", ""),
      condition: currentWeather.label,
      city: currentWeather.city || city,
      datetime: getCurrentDateTime(),
      minTemp: currentWeather.raw?.main?.temp_min
        ? Math.round(currentWeather.raw.main.temp_min)
        : null,
      maxTemp: currentWeather.raw?.main?.temp_max
        ? Math.round(currentWeather.raw.main.temp_max)
        : null,
      feelsLike: currentWeather.raw?.main?.feels_like
        ? Math.round(currentWeather.raw.main.feels_like)
        : null,
      humidity: currentWeather.humidity,
      windSpeed: currentWeather.raw?.wind?.speed
        ? Math.round(currentWeather.raw.wind.speed * 3.6)
        : null,
      windDirection: currentWeather.raw?.wind?.deg
        ? getWindDirection(currentWeather.raw.wind.deg)
        : null,
      pressure: currentWeather.raw?.main?.pressure,
      visibility: currentWeather.raw?.visibility
        ? Math.round(currentWeather.raw.visibility / 1000)
        : null,
      uvIndex:
        currentWeather.raw?.uvi !== undefined
          ? Math.round(currentWeather.raw.uvi)
          : null,
      icon: currentWeather.icon,
    };
  }, [isLoadingWeather, error, currentWeather, city]);

  if (isLoadingWeather) {
    return (
      <View style={styles.compactCard}>
        <ActivityIndicator size="small" color="#ddeefc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !currentWeather) {
    return (
      <View style={[styles.compactCard, styles.errorCard]}>
        <Text style={styles.errorText}>Weather unavailable</Text>
      </View>
    );
  }

  if (!compactWeatherData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.compactCard}>
        {/* Main Weather Info */}
        <View style={styles.mainRow}>
          <WeatherIcon condition={compactWeatherData.icon} size={32} />
          <View style={styles.primaryInfo}>
            <Text style={styles.temperature}>
              {compactWeatherData.temperature}°C
            </Text>
            <Text style={styles.condition}>{compactWeatherData.condition}</Text>
          </View>
          <View style={styles.secondaryInfo}>
            <Text style={styles.city}>{compactWeatherData.city}</Text>
            <Text style={styles.datetime}>{compactWeatherData.datetime}</Text>
          </View>
        </View>

        {/* Compact Details Row */}
        <View style={styles.detailsRow}>
          {(compactWeatherData.minTemp || compactWeatherData.maxTemp) && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Range</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.minTemp && compactWeatherData.maxTemp
                  ? `${compactWeatherData.minTemp}°-${compactWeatherData.maxTemp}°`
                  : compactWeatherData.minTemp
                    ? `Min ${compactWeatherData.minTemp}°`
                    : `Max ${compactWeatherData.maxTemp}°`}
              </Text>
            </View>
          )}

          {compactWeatherData.feelsLike && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Feels</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.feelsLike}°C
              </Text>
            </View>
          )}

          {compactWeatherData.humidity && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.humidity}%
              </Text>
            </View>
          )}

          {compactWeatherData.windSpeed && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.windSpeed} km/h{" "}
                {compactWeatherData.windDirection}
              </Text>
            </View>
          )}

          {compactWeatherData.uvIndex !== null && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>UV</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.uvIndex}
              </Text>
            </View>
          )}

          {compactWeatherData.visibility && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Visibility</Text>
              <Text style={styles.detailValue}>
                {compactWeatherData.visibility} km
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  compactCard: {
    backgroundColor: "#2455a9",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 110,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    justifyContent: "space-between",
  },
  errorCard: {
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingText: {
    color: "#ddeefc",
    fontSize: 12,
    marginLeft: 8,
    fontWeight: "500",
    alignItems: "center",
    justifyContent: "center"
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  primaryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  secondaryInfo: {
    alignItems: "flex-end",
  },
  temperature: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  condition: {
    fontSize: 12,
    color: "#ddeefc",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  city: {
    fontSize: 16,
    color: "#b3d4f1",
    fontWeight: "500",
    marginBottom: 2,
  },
  datetime: {
    fontSize: 11,
    color: "#9bb5d1",
    fontWeight: "400",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  detailItem: {
    alignItems: "center",
    minWidth: 50,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: "#9bb5d1",
    fontWeight: "500",
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 10,
    color: "#ddeefc",
    fontWeight: "600",
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 8,
    color: "#9bb5d1",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
    opacity: 0.8,
  },
  iconBase: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    // fontSize is set dynamically based on size prop
    textAlign: "center",
  },
  iconSunny: {
    backgroundColor: "#FFD700",
  },
  iconSunnyText: {
    color: "#FFA500",
  },
  iconClouds: {
    backgroundColor: "#E6E6FA",
  },
  iconCloudsText: {
    color: "#708090",
  },
  iconRain: {
    backgroundColor: "#B0C4DE",
  },
  iconRainText: {
    color: "#4169E1",
  },
  iconThunder: {
    backgroundColor: "#2F4F4F",
  },
  iconThunderText: {
    color: "#FFD700",
  },
  iconDefault: {
    backgroundColor: "#E6E6FA",
  },
  iconDefaultText: {
    color: "#708090",
  },
});
