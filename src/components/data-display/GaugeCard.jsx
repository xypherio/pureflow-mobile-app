/** GaugeCard (WaterQualityGauge) - Circular gauge displaying overall water quality score with parameter progress bars */
import { globalStyles } from "@styles/globalStyles.js";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    minHeight: 140,
    width: "100%",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  gaugeContainer: {
    flex: 1,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  breakdownContainer: {
    flex: 1,
    paddingLeft: 10,
  },
  parameterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginLeft: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
});

export default function WaterQualityGauge({ percentage, parameters: paramValues }) {
  const progress = Math.min(Math.max(percentage, 0), 100);

  const status =
    progress >= 70 ? "Normal" : progress >= 40 ? "Caution" : "Poor";
  const statusColor =
    progress >= 70 ? "#3ab57c" : progress >= 40 ? "#f73535" : "#ef4444";

  const parameters = [
    { color: "#007bff", icon: Droplet, label: "pH Level", value: paramValues?.pH || 0 },
    { color: "#e83e8c", icon: Thermometer, label: "Temperature", value: paramValues?.Temperature || 0 },
    { color: "#28a745", icon: Gauge, label: "TDS", value: paramValues?.Turbidity || 0 },
    { color: "#8b5cf6", icon: Waves, label: "Salinity", value: paramValues?.Salinity || 0 },
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
    <View style={[styles.container, globalStyles.boxShadow]}>
      <View style={styles.contentContainer}>
        {/* Gauge section (left) */}
        <View style={styles.gaugeContainer}>
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
          <Text style={[styles.percentageText, { color: statusColor }]}>
            {progress}%
          </Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status}
          </Text>
        </View>

        {/* Breakdown section (right) */}
        <View style={styles.breakdownContainer}>
          {parameters.map((param, idx) => (
            <View key={idx} style={styles.parameterRow}>
              <IconComponent
                icon={param.icon}
                color={param.color}
                size={16}
              />
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${param.value}%`,
                      backgroundColor: param.color
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Helper component for consistent icon rendering
const IconComponent = ({ icon: Icon, color, size }) => (
  <Icon color={color} size={size} />
);
