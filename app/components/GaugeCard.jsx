import React from "react";
import { Text, View } from "react-native";
import PieChart from "react-native-pie-chart";

export default function GaugeCard({ label = "pH", value = 7.2, minSafe = 6.5, maxSafe = 8.5, unit = "" }) {
  // Clamp value within the min and max for display
  const clampedValue = Math.max(minSafe, Math.min(value, maxSafe));
  const safeRange = maxSafe - minSafe;
  const valuePortion = Math.max(0.01, clampedValue - minSafe); // Avoid zero or negative
  const remainderPortion = Math.max(0.01, safeRange - valuePortion); // Avoid zero or negative
  const size = 120;
  const series = [valuePortion, remainderPortion];
  const isSafe = value >= minSafe && value <= maxSafe;
  const colors = [isSafe ? "#4CAF50" : "#F44336", "#E0E0E0"];

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{label} Gauge</Text>
      <PieChart
        width={size}
        height={size}
        series={series}
        sliceColor={colors}
        coverRadius={0.7}
        coverFill={'#fff'}
      />
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 8 }}>{value}{unit}</Text>
      <Text style={{ color: isSafe ? '#4CAF50' : '#F44336', fontWeight: 'bold', marginTop: 4 }}>
        {isSafe ? 'Safe' : 'Out of Range'} (Safe: {minSafe}–{maxSafe}{unit})
      </Text>
    </View>
  );
} 