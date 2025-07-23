import { globalStyles } from "@styles/globalStyles";
import { useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import SegmentedFilter from "./segmented-filters";

const filterFieldMap = {
  "pH": "ph",
  "Temp": "temperature",
  "TDS": "tds",
  "Salinity": "salinity",
};

const filterDotColorMap = {
  "pH": "#007bff",
  "Temp": "#e83e8c",
  "TDS": "#28a745",
  "Salinity": "#8b5cf6",
};

const filterFillColorMap = {
  "pH": "#007bff",
  "Temp": "#e83e8c",
  "TDS": "#28a745",
  "Salinity": "#8b5cf6",
};

export default function LineChartCard() {
  const [activeFilter, setActiveFilter] = useState("pH");
  const { data, loading, error } = useFirestoreCollection("datm_data");

  // Memoize chart data for performance
  const chartData = useMemo(() => {
    const field = filterFieldMap[activeFilter] || "ph";
    const recentData = data.slice(-7); // last 7 (most recent) in ascending order
    return {
      labels: recentData.map((_, idx) => `#${idx + 1}`),
      datasets: [
        {
          data: recentData.map(d => {
            const val = d[field];
            return typeof val === "number" ? val : (parseFloat(val) || 0);
          }),
          color: (opacity = 1) => `${filterFillColorMap[activeFilter]}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          strokeWidth: 3,
        },
      ],
    };
  }, [data, activeFilter]);

  if (loading) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", height: 220 }}>
        <ActivityIndicator size="large" color="#2455a9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", height: 220 }}>
        <Text style={{ color: "#e83e8c" }}>Error loading chart data</Text>
      </View>
    );
  }

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
        data={chartData}
        width={Dimensions.get("window").width - 60}
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1}
        yAxisColor="#6B7280"
        xAxisColor="#6B7280"
        color={filterFillColorMap[activeFilter]}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        chartConfig={{
          backgroundColor: "#f6fafd",
          backgroundGradientFrom: "#f6fafd",
          backgroundGradientTo: "#f6fafd",
          decimalPlaces: 0,
          color: (opacity = 1) => filterFillColorMap[activeFilter],
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: filterDotColorMap[activeFilter],
            fill: "#ffffff",
          },
          fillShadowGradient: filterFillColorMap[activeFilter],
          fillShadowGradientOpacity: 0.2,
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
