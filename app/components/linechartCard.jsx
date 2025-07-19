import { globalStyles } from "@styles/globalStyles";
import { chartStyles } from "@utils/chartStyles";
import { useState } from "react";
import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import SegmentedFilter from "./segmentedFilter";

export default function LineChartCard({ children }) {
  const [activeFilter, setActiveFilter] = useState("");

  return (
    <View
      style={{
        backgroundColor: "#f6fafd",
        borderRadius: 16,
        padding: 16,
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
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
          ],
          datasets: [
            {
              data: [20, 45, 28, 80, 99, 43],
            },
          ],
        }}
        thickness={5}
        width={Dimensions.get("window").width - 60}
        height={200}
        yAxisLabel=""
        yAxisSuffix="°C"
        yAxisInterval={1}
        yAxisColor="#000"
        xAxisColor="#000"
        color="#000"
        chartConfig={chartStyles.chartConfig}
        showGradient={true}
        style={chartStyles.container}
      />
    </View>
  );
}
