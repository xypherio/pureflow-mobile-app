import SegmentedFilter from "@navigation/segmented-filters";
import { globalStyles } from "@styles/globalStyles.js";
import React from "react";
import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

export default function LineChartCard() {
  // Dummy data for demonstration
  const chartToRender = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
        color: (opacity = 1) => `rgba(36, 85, 169, ${opacity})`, // optional
        strokeWidth: 2, // optional
      },
    ],
  };

  // You can manage the active filter state here
  const [activeFilter, setActiveFilter] = React.useState("Weekly");

  return (
    <View
      style={{
        backgroundColor: "#f6fafd",
        borderRadius: 16,
        padding: 12,
        marginTop: 20,
        marginBottom: 10,
        justifyContent: "flex-start",
        ...globalStyles.boxShadow,
      }}
    >
      <SegmentedFilter
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />
      <LineChart
        data={chartToRender}
        width={Dimensions.get("window").width - 60}
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1}
        yAxisColor="#6B7280"
        xAxisColor="#6B7280"
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        chartConfig={{
          backgroundColor: "#f6fafd",
          backgroundGradientFrom: "#f6fafd",
          backgroundGradientTo: "#f6fafd",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(36, 85, 169, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#2455a9",
            fill: "#ffffff",
          },
          fillShadowGradient: "#2455a9",
          fillShadowGradientOpacity: 0.2,
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#E5E7EB",
            strokeWidth: 1,
          },
          propsForLabels: {
            fontSize: 10,
          },
          propsForVerticalLabels: {
            fontSize: 10,
            fill: "#6B7280",
          },
          propsForHorizontalLabels: {
            fontSize: 10,
            fill: "#6B7280",
          },
        }}
        showGradient={true}
        bezier
        style={{
          marginVertical: 0,
          borderRadius: 16,
        }}
      />
    </View>
  );
}
