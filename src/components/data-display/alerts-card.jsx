import { globalStyles } from "@styles/globalStyles.js";
import * as Lucide from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

const parameterIconMap = {
  ph: Lucide.Droplet,
  temperature: Lucide.Thermometer,
  tds: Lucide.Waves,
  salinity: Lucide.Water,
  // Add more as needed
};

const typeStyles = {
  success: {
    bg: "#e6f9ec", // soft green
    icon: Lucide.CheckCircle2,
    iconColor: "#22c55e",
    title: "#15803d",
    message: "#15803d",
  },
  warning: {
    bg: "#fff7e6", // soft yellow
    icon: Lucide.AlertCircle,
    iconColor: "#f59e42",
    title: "#b45309",
    message: "#b45309",
  },
  error: {
    bg: "#ffeaea", // soft red
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

export default function AlertsCard({ alerts = [], interval = 4000 }) {
  console.log("alerts", alerts);
  const [current, setCurrent] = useState(0);
  const [translateXAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(1));

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
          message: `All key parameters (${keyParameters.join(
            ", "
          )}) are within the normal range.`,
        },
      ];

  useEffect(() => {
    if (displayAlerts.length <= 1) return;
    const timer = setInterval(() => {
      // Slide left and fade out
      Animated.parallel([
        Animated.timing(translateXAnim, {
          toValue: -30,
          duration: 300,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        setCurrent((prev) => {
          const next = (prev + 1) % displayAlerts.length;
          return isNaN(next) ? 0 : next;
        });
        // Reset position to right and fade in
        translateXAnim.setValue(30); // start to the right
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.timing(translateXAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
            easing: Easing.in(Easing.ease),
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
            easing: Easing.in(Easing.ease),
          }),
        ]).start();
      });
    }, interval);
    return () => clearInterval(timer);
  }, [displayAlerts, interval, translateXAnim, opacityAnim]);

  if (!displayAlerts.length) {
    return null;
  }

  const alert = displayAlerts[current];

  // Guard: If alert is undefined, render nothing (or a fallback)
  if (!alert) return null;

  const style = typeStyles[alert.type] || typeStyles.error;
  const ParameterIcon =
    alert.parameter && parameterIconMap[alert.parameter]
      ? parameterIconMap[alert.parameter]
      : Lucide.HelpCircle;
  const LevelIcon = style.icon;

  // Helper to capitalize each word in a string
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Helper to capitalize only the first letter
  function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ translateX: translateXAnim }],
        backgroundColor: style.bg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        minHeight: 80,
        height: 80,
        ...globalStyles.boxShadow,
        position: "relative",
      }}
    >
      {/* Color indicator bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 10,
          bottom: 10,
          width: 6,
          borderRadius: 3,
          backgroundColor:
            alert.type === "success"
              ? "#22c55e"
              : alert.type === "warning"
              ? "#f59e42"
              : alert.type === "error"
              ? "#ef4444"
              : "#2563eb",
        }}
      />
      {/* Parameter icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginLeft: 10,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <ParameterIcon size={22} color={style.iconColor} />
      </View>
      {/* Texts */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontWeight: "bold",
            color: style.title,
            fontSize: 16,
            marginBottom: 2,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {capitalizeWords(alert.title)}
        </Text>
        <Text
          style={{ color: style.message, fontSize: 14 }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {capitalizeFirst(alert.message)}
        </Text>
        {/* Normal range display */}
        {alert.threshold &&
          alert.threshold.min !== undefined &&
          alert.threshold.max !== undefined && (
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
              Normal range: {alert.threshold.min} - {alert.threshold.max}
            </Text>
          )}
      </View>
      {/* Severity icon (right) */}
      <View style={{ marginLeft: 12 }}>
        <LevelIcon size={22} color={style.iconColor} />
      </View>
    </Animated.View>
  );
}
