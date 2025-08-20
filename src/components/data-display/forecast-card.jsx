import { globalStyles } from "@styles/globalStyles.js";
import {
  ArrowDownRight,
  ArrowUpRight,
  Droplet,
  Gauge,
  Thermometer,
  Waves,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

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

  const baseContainerStyle = {
    backgroundColor: "#f6fafd",
    padding: 16,
    marginRight: 12,
    width: 190,
    height: 130,
    borderRadius: 16,
    ...globalStyles.boxShadow,
  };

  const breachStyles = breachPredicted
    ? { borderWidth: 1, borderColor: "#ef4444", backgroundColor: "#fee2e2" }
    : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ ...baseContainerStyle, ...breachStyles }}
    >
      {/* Background Arrow */}
      {backgroundArrowMap[trend]}

      {/* Foreground Content */}
      <Text
        style={{ fontSize: 13, color: "#6b7280", fontWeight: "600", zIndex: 2 }}
      >
        {title}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
          zIndex: 2,
        }}
      >
        {iconMap[title]}
        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            marginLeft: 10,
            color:
              title === "pH"
                ? "#007bff" // purple
                : title === "Temperature"
                ? "#e83e8c" // amber
                : title === "Turbidity"
                ? "#28a745" // sky blue
                : title === "Salinity"
                ? "#8b5cf6" // indigo
                : "#1f2937", // default
          }}
        >
          {value}
        </Text>
      </View>

      <Text
        style={{ fontSize: 13, marginTop: 6, color: trendColor, zIndex: 2 }}
      >
        {trendLabel}
      </Text>
    </TouchableOpacity>
  );
}
