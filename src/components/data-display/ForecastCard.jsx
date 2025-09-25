import { globalStyles } from "@styles/globalStyles.js";
import {
  ArrowDownRight,
  ArrowUpRight,
  Droplet,
  Gauge,
  Thermometer,
  Waves,
} from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const iconMap = {
  pH: <Gauge size={36} color="#3b82f6" />,
  Temperature: <Thermometer size={36} color="#d82a71" />,
  Turbidity: <Droplet size={36} color="#10b981" />,
  Salinity: <Waves size={36} color="#8b5cf6" />,
};

const backgroundArrowMap = {
  rising: (
    <ArrowUpRight
      size={100}
      color="rgba(34, 197, 94, 0.08)"
      style={{ position: "absolute", bottom: -5, right: -5 }}
    />
  ),
  falling: (
    <ArrowDownRight
      size={100}
      color="rgba(239, 68, 68, 0.08)"
      style={{ position: "absolute", bottom: -5, right: -5 }}
    />
  ),
  stable: null,
};

const stylesheet = StyleSheet.create({
  risingArrow: {
    position: "absolute",
    bottom: -5,
    right: -5,
  },
  fallingArrow: {
    position: "absolute",
    bottom: -5,
    right: -5,
  },
  baseContainer: {
    backgroundColor: "#f6fafd",
    padding: 16,
    marginRight: 12,
    width: 190,
    height: 130,
    borderRadius: 18,
    ...globalStyles.boxShadow,
  },
  breach: {
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#fee2e2",
  },
  title: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    zIndex: 2,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    zIndex: 2,
  },
  value: {
    fontSize: 30,
    fontWeight: "700",
    marginLeft: 10,
  },
  trend: {
    fontSize: 13,
    marginTop: 6,
    zIndex: 2,
  },
});

export default function ForecastCard({
  title,
  value,
  trend,
  onPress,
  breachPredicted = false,
}) {
  const trendLabel =
    trend === "rising"
      ? "Increasing"
      : trend === "falling"
      ? "Decreasing"
      : "Stable";

  const trendColor =
    trend === "rising"
      ? "#22c55e"
      : trend === "falling"
      ? "#ef4444"
      : "#9ca3af";

  const breachStyles = breachPredicted ? stylesheet.breach : {};

  const getValueColor = () => {
    switch (title) {
      case "pH":
        return "#007bff"; // purple
      case "Temperature":
        return "#e83e8c"; // amber
      case "Turbidity":
        return "#28a745"; // sky blue
      case "Salinity":
        return "#8b5cf6"; // indigo
      default:
        return "#1f2937"; // default
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[stylesheet.baseContainer, breachStyles]}
    >
      {/* Background Arrow */}
      {backgroundArrowMap[trend]}

      {/* Foreground Content */}
      <Text style={stylesheet.title}>{title}</Text>

      <View style={stylesheet.valueContainer}>
        {iconMap[title]}
        <Text
          style={[stylesheet.value, { color: getValueColor() }]}
        >
          {value}
        </Text>
      </View>

      <Text style={[stylesheet.trend, { color: trendColor }]}>
        {trendLabel}
      </Text>
    </TouchableOpacity>
  );
}
