import { globalStyles } from "@styles/globalStyles";
import { useState } from "react";
import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import SegmentedFilter from "./segmented-filters";

export default function LineChartCard({ children }) {
  const [activeFilter, setActiveFilter] = useState("");

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
        data={{
          labels: [
            "Jun",
            "Jul", 
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          datasets: [
            {
              data: [52, 68, 42, 27, 53, 80, 71],
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              strokeWidth: 3,
            },
          ],
        }}
        width={Dimensions.get("window").width - 60}
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1}
        yAxisColor="#6B7280"
        xAxisColor="#6B7280"
        color="#6B7280"
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        chartConfig={{
          backgroundColor: "#f6fafd",
          backgroundGradientFrom: "#f6fafd",
          backgroundGradientTo: "#f6fafd",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#3B82F6",
            fill: "#ffffff",
          },
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#E5E7EB",
            strokeWidth: 1,
          },
          // Reduce left margin
          propsForLabels: {
            fontSize: 10,
          },
          // Adjust chart margins
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
