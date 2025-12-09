/** AlertCardItem - Individual alert card component with status indicators, parameter icons, and expandable content */
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudLightning,
  CloudRain,
  Droplet,
  Thermometer,
  XCircle,
} from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const parameterIconMap = {
  ph: Droplet,
  temperature: Thermometer,
  salinity: Droplet,
  turbidity: Cloud,
  default: Droplet,
};

const weatherIconMap = {
  noRain: Cloud,
  lightRain: CloudRain,
  heavyRain: CloudLightning,
};

export default function AlertCardItem({ alert }) {
  
  const isWeatherAlert =
    alert.parameter === "Weather" ||
    alert.parameter?.toLowerCase() === "israining" ||
    alert.parameter?.toLowerCase() === "weather";

  // Use blue "info" theme for weather alerts, regular theme for others
  const style = isWeatherAlert
    ? typeStyles.info
    : typeStyles[alert.type] || typeStyles.error;

  // Function to get weather icon
  const getWeatherIcon = useCallback((parameter, value) => {
    if (
      parameter?.toLowerCase() === "israining" ||
      parameter?.toLowerCase() === "isRaining"
    ) {
      switch (parseInt(value)) {
        case 0:
          return weatherIconMap.noRain;
        case 1:
          return weatherIconMap.lightRain;
        case 2:
          return weatherIconMap.heavyRain;
        default:
          return weatherIconMap.lightRain;
      }
    }
    return null;
  }, []);

  // Get appropriate icon
  const ParameterIcon = useMemo(() => {
    // Check parameter-specific icons first
    if (alert.parameter && parameterIconMap[alert.parameter.toLowerCase()]) {
      return parameterIconMap[alert.parameter.toLowerCase()];
    }

    // Check weather-specific icons
    if (alert.parameter) {
      const weatherIcon = getWeatherIcon(alert.parameter, alert.value);
      if (weatherIcon) {
        return weatherIcon;
      }
    }

    return parameterIconMap.default;
  }, [alert.parameter, alert.value, getWeatherIcon]);

  // Helper functions
  const capitalizeWords = (str) => {
    return str?.replace(/\b\w/g, (char) => char.toUpperCase()) || str;
  };

  const capitalizeFirst = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getUnit = (parameter) => {
    switch (parameter?.toLowerCase()) {
      case "temperature":
        return "°C";
      case "ph":
        return "PH";
      case "salinity":
        return "PPT";
      case "turbidity":
        return "NTU";
      default:
        return "";
    }
  };

  const getTitle = (alert) => {
    if (alert.title) {
      return alert.title;
    }
    // Fallback for alerts without title
    const param = capitalizeFirst(alert.parameter || "Unknown");
    const value = alert.value;
    const unit = getUnit(alert.parameter);
    return `${param} Alert - ${value} ${unit}`.trim();
  };

  const getIndicatorColor = () => {
    // Weather alerts always use blue theme regardless of severity
    if (isWeatherAlert) {
      return "#2563eb";
    }
  // border left color
    switch (alert.type) {
      case "success":
        return "#22c55e";
      case "warning":
        return "#fcbd4d";
      case "error":
        return "#ef4444";
      default:
        return "#2563eb";
    }
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: style.bg }]}>
      {/* Color indicator bar */}
      <View
        style={[styles.indicatorBar, { backgroundColor: getIndicatorColor() }]}
      />

      {/* Parameter icon */}
      <View style={styles.iconContainer}>
        <ParameterIcon size={22} color={style.iconColor} />
      </View>

      {/* Alert text content */}
      <View style={styles.textContainer}>
        <Text
          style={[styles.titleText, { color: style.title }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getTitle(alert)}
        </Text>
        <Text
          style={[styles.messageText, { color: style.message }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {capitalizeFirst(alert.message)}
        </Text>
      </View>
    </View>
  );
}

const typeStyles = {
  success: {
    bg: "#e6f9ec",
    icon: CheckCircle2,
    iconColor: "#22c55e",
    title: "#15803d",
    message: "#15803d",
  },
  warning: {
    bg: "#fff8eb",
    icon: AlertCircle,
    iconColor: "#f59e42",
    title: "#b45309",
    message: "#b45309",
  },
  error: {
    bg: "#ffeaea",
    icon: XCircle,
    iconColor: "#ef4444",
    title: "#b91c1c",
    message: "#b91c1c",
  },
  info: {
    bg: "#f6fafd",
    icon: CloudRain,
    iconColor: "#2563eb",
    title: "#1c5c88",
    message: "#1c5c88",
  },
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    height: 90,
    width: "100%",
    position: "relative",
  },
  indicatorBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 6,
    borderRadius: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textContainer: {
    flex: 1,
    minHeight: 44,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    flexWrap: "wrap",
  },
});
