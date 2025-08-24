import { globalStyles } from "@styles/globalStyles.js";
import { CloudRain, CloudSun, Sun } from "lucide-react-native";
import { Image, Text, View } from "react-native";

const LOGO_PATH = require("../../../assets/logo/pureflow-logo.png");

const weatherIconMap = {
  rain: <CloudRain size={24} color="#3b82f6" />,
  sunny: <Sun size={24} color="#fbbf24" />,
  partly: <CloudSun size={24} color="#facc15" />,
};

export default function PureFlowLogo({
  weather = { label: "Light Rain", temp: "30°C", icon: "rain" },
  style,
  ...props
}) {
  return (
    <View
      style={{
        position: "absolute",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 15,
        paddingTop: 23,
        backgroundColor: "#e5f0f9",
        zIndex: 9999,
      }}
    >
      {/* PureFlow Logo */}
      <Image
        source={LOGO_PATH}
        style={[globalStyles.logo, style]}
        accessibilityLabel="pureflow_logo"
        {...props}
      />

      {/* Weather Info */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {weatherIconMap[weather.icon] || (
          <CloudRain size={24} color="#3b82f6" />
        )}
        <View style={{ marginLeft: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b" }}>
            {weather.label}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b" }}>{weather.temp}</Text>
        </View>
      </View>
    </View>
  );
}
