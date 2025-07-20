import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function WaterQualityGauge({ percentage, parameters: paramValues }) {
  const progress = Math.min(Math.max(percentage, 0), 100);

  const status =
    progress >= 70 ? "Normal" : progress >= 40 ? "Caution" : "Poor";
  const statusColor =
    progress >= 70 ? "#3ab57c" : progress >= 40 ? "#f73535" : "#ef4444";

  const parameters = [
    { color: "#007bff", icon: Droplet, label: "pH Level", value: paramValues?.ph || 0 },
    { color: "#e83e8c", icon: Thermometer, label: "Temperature", value: paramValues?.temp || 0 },
    { color: "#28a745", icon: Gauge, label: "TDS", value: paramValues?.turbidity || 0 },
    { color: "#8b5cf6", icon: Waves, label: "Salinity", value: paramValues?.salinity || 0 },
  ];

  const radius = 50;
  const strokeWidth = 10;
  const center = radius + strokeWidth;
  const circumference = Math.PI * radius;
  const arcLength = (percentage / 100) * circumference;

  const describeArc = (percent) => {
    const angle = (percent / 100) * 180;
    const largeArc = angle > 180 ? 1 : 0;
    const x = center + radius * Math.cos((Math.PI * (1 - percent / 100)));
    const y = center - radius * Math.sin((Math.PI * (1 - percent / 100)));
    return `M${center - radius},${center} A${radius},${radius} 0 ${largeArc} 1 ${x},${y}`;
  };

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        minHeight: 140,
        width: "100%",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Gauge section (left) */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Svg height={center + 10} width={center * 2}>
            {/* Background semi-circle */}
            <Path
              d={`M${center - radius},${center} A${radius},${radius} 0 1 1 ${
                center + radius
              },${center}`}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress arc */}
            <Path
              d={describeArc(progress)}
              stroke={statusColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
          </Svg>
          <Text style={{ fontSize: 16, fontWeight: "800", color: statusColor }}>
            {progress}%
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "600", color: statusColor }}>
            {status}
          </Text>
        </View>

        {/* Breakdown section (right) */}
        <View style={{ flex: 1, paddingLeft: 10 }}>
          {parameters.map((param, idx) => {
            const Icon = param.icon;
            return (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Icon color={param.color} size={16} />
                <View
                  style={{
                    height: 6,
                    flex: 1,
                    backgroundColor: "#E5E7EB",
                    borderRadius: 4,
                    marginLeft: 8,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${param.value}%`,
                      height: "100%",
                      backgroundColor: param.color,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
