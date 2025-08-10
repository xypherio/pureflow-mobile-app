import { globalStyles } from "@styles/globalStyles.js";
import {
    ArrowDownRight,
    ArrowUpRight,
    Droplet,
    Gauge,
    Thermometer,
    Waves,
} from "lucide-react-native";
import { Text, View } from "react-native";

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

export default function ForecastCard({ title, value, trend }) {
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

  return (
    <View
      style={{
        backgroundColor: "#f6fafd",
        padding: 16,
        marginRight: 12,
        width: 170,
        borderRadius: 16,
        ...globalStyles.boxShadow,
        height: 130,
      }}
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
            fontSize: 24,
            fontWeight: "700",
            marginLeft: 10,
            color: "#1f2937",
          }}
        >
          {value}
        </Text>
      </View>

      <Text
        style={{ fontSize: 15, marginTop: 6, color: trendColor, zIndex: 2 }}
      >
        {trendLabel}
      </Text>
    </View>
  );
}
