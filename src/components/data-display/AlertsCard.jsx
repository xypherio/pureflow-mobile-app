import { globalStyles } from "@styles/globalStyles.js";
import * as Lucide from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const parameterIconMap = {
  ph: Lucide.Droplet,
  temperature: Lucide.Thermometer,
  tds: Lucide.Waves,
  salinity: Lucide.Water,
  // Add more as needed
};

const typeStyles = {
  success: {
    bg: "#e6f9ec",
    icon: Lucide.CheckCircle2,
    iconColor: "#22c55e",
    title: "#15803d",
    message: "#15803d",
  },
  warning: {
    bg: "#fff7e6",
    icon: Lucide.AlertCircle,
    iconColor: "#f59e42",
    title: "#b45309",
    message: "#b45309",
  },
  error: {
    bg: "#ffeaea",
    icon: Lucide.XCircle,
    iconColor: "#ef4444",
    title: "#b91c1c",
    message: "#b91c1c",
  },
  info: {
    bg: "#f6fafd",
    icon: Lucide.CloudRain,
    iconColor: "#2563eb",
    title: "#1c5c88",
    message: "#1c5c88",
  },
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 80,
    height: 80,
    ...globalStyles.boxShadow,
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
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  thresholdText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: "#e5e7eb",
  },
  dotActive: {
    backgroundColor: "#3b82f6",
  },
});

export default function AlertsCard({ alerts = [], interval = 4000 }) {
  const [current, setCurrent] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const previousAlertTypeRef = useRef('success');

  const hasAlertsWithParameter =
    Array.isArray(alerts) && alerts.some((a) => a && a.parameter);

  const keyParameters = ["pH", "Temperature", "TDS", "Salinity"];

  const displayAlerts = hasAlertsWithParameter
    ? alerts.filter((a) => a && a.parameter)
    : [
        {
          parameter: "",
          type: "success",
          title: "All Parameters Normal",
          message: `All parameters (${keyParameters.join(
            ", "
          )}) are within the normal range.`,
        },
      ];

  // Sound effects disabled due to expo-av compatibility issues
  // TODO: Re-enable when expo-av is properly configured in the project
  // For now, alerts work visually without audio

  // Animation and index logic
  useEffect(() => {
    if (displayAlerts.length <= 1) return;
    let isMounted = true;
    const animateToNext = () => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(() => {
        if (!isMounted) return;
        setCurrent((prev) => (prev + 1) % displayAlerts.length);
        scaleAnim.setValue(1.05);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]).start();
      });
    };
    const timer = setInterval(animateToNext, interval);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [displayAlerts.length, interval, scaleAnim, opacityAnim]);

  // Reset current index if alerts change
  useEffect(() => {
    setCurrent(0);
  }, [alerts]);

  if (!displayAlerts.length) {
    return null;
  }

  const alert = displayAlerts[current];

  if (!alert) return null;

  const style = typeStyles[alert.type] || typeStyles.error;
  // Use parameter icon if available, fallback to type icon, then HelpCircle
  const ParameterIcon =
    alert.parameter && parameterIconMap[alert.parameter.toLowerCase()]
      ? parameterIconMap[alert.parameter.toLowerCase()]
      : style.icon || Lucide.HelpCircle;

  // Helper to capitalize each word in a string
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Helper to capitalize only the first letter
  function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const getIndicatorColor = () => {
    switch (alert.type) {
      case "success":
        return "#22c55e";
      case "warning":
        return "#f59e42";
      case "error":
        return "#ef4444";
      default:
        return "#2563eb";
    }
  };

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Animated.View
        style={[
          stylesheet.cardContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: style.bg,
          },
        ]}
      >
        {/* Color indicator bar */}
        <View
          style={[stylesheet.indicatorBar, { backgroundColor: getIndicatorColor() }]}
        />
        {/* Parameter icon */}
        <View style={stylesheet.iconContainer}>
          <ParameterIcon size={22} color={style.iconColor} />
        </View>
        {/* Texts */}
        <View style={stylesheet.textContainer}>
          <Text
            style={[stylesheet.titleText, { color: style.title }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {capitalizeWords(alert.title)}
          </Text>
          <Text
            style={[stylesheet.messageText, { color: style.message }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {capitalizeFirst(alert.message)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const stylesheet = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 70,
    height: 75,
    ...globalStyles.boxShadow,
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
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  thresholdText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
});
