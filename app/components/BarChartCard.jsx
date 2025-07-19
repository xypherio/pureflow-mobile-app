import React from "react";
import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

const mockData = [
  { value: 7.2, label: "pH", frontColor: "#4CAF50" },
  { value: 30.5, label: "Temp", frontColor: "#FFC107" },
  { value: 1200, label: "TDS", frontColor: "#2196F3" },
  { value: 3.5, label: "Turbidity", frontColor: "#F44336" },
];

export default function BarChartCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Parameter Comparison</Text>
      <BarChart
        data={mockData}
        barWidth={32}
        spacing={24}
        roundedTop
        roundedBottom
        xAxisLabelTextStyle={{ color: '#333', fontSize: 12 }}
        yAxisTextStyle={{ color: '#333', fontSize: 12 }}
        yAxisThickness={0}
        xAxisThickness={0}
        noOfSections={4}
        maxValue={1500}
        height={180}
      />
    </View>
  );
} 