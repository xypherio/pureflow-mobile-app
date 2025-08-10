import { globalStyles } from "@styles/globalStyles.js";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

const PARAMETER_CONFIG = {
  pH: {
    icon: Gauge,
    bgColor: "#E0F2FE",
    iconColor: "#0284C7",
    unit: "pH",
    normalRange: "6.5-8.5",
  },
  Temperature: {
    icon: Thermometer,
    bgColor: "#FEF3C7",
    iconColor: "#D97706",
    unit: "°C",
    normalRange: "15-35",
  },
  TDS: {
    icon: Droplet,
    bgColor: "#DBEAFE",
    iconColor: "#2563EB",
    unit: "ppm",
    normalRange: "0-500",
  },
  Salinity: {
    icon: Waves,
    bgColor: "#E0E7FF",
    iconColor: "#7C3AED",
    unit: "ppt",
    normalRange: "0-35",
  },
  Turbidity: {
    icon: Droplet,
    bgColor: "#F3E8FF",
    iconColor: "#9333EA",
    unit: "NTU",
    normalRange: "0-5",
  },
  EC: {
    icon: Gauge,
    bgColor: "#FEF3C7",
    iconColor: "#D97706",
    unit: "µS/cm",
    normalRange: "0-1500",
  },
};

export default function ParameterGridCard({
  parameter,
  value,
  status = "normal",
  onPress,
}) {
  const config = PARAMETER_CONFIG[parameter] || PARAMETER_CONFIG.pH;
  const IconComponent = config.icon;

  const getStatusColor = (status) => {
    switch (status) {
      case "normal":
        return "#10B981";
      case "moderate":
        return "#F59E0B";
      case "critical":
        return "#EF4444";
      default:
        return "#10B981";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        minHeight: 150,
        flexBasis: "48%",
        flexShrink: 0,
        justifyContent: "space-between",
        ...globalStyles.boxShadow,
      }}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            borderRadius: 24,
            backgroundColor: config.bgColor,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <IconComponent size={24} color={config.iconColor} />
        </View>

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 4,
          }}
        >
          {parameter}
        </Text>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 4,
          }}
        >
          {value}
          {config.unit}
        </Text>

        <View
          style={{
            backgroundColor: getStatusColor(status) + "20",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: getStatusColor(status),
              textTransform: "capitalize",
            }}
          >
            {status}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 10,
            color: "#6B7280",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Normal: {config.normalRange}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
