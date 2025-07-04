import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AlertCircle,
  Droplet,
  TestTube2,
  Thermometer,
  LineChart as TrendIcon,
  Waves,
} from "lucide-react-native";
import { useState } from "react";
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

const LOGO_PATH = require("../../assets/images/pureflow-logo-1.png");

const generateBarLabels = (type) => {
  if (type === "monthly")
    return Array.from({ length: 31 }, (_, i) => `${i + 1}`);
  if (type === "annual")
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
  return ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM"];
};

const generateBarData = (labels) => {
  const base = labels.length;
  return {
    labels,
    datasets: [
      {
        data: Array(base)
          .fill()
          .map(() => Math.floor(Math.random() * 10)),
        color: () => `#007bff`,
        label: "pH",
      },
      {
        data: Array(base)
          .fill()
          .map(() => Math.floor(Math.random() * 10)),
        color: () => `#e83e8c`,
        label: "Temp",
      },
      {
        data: Array(base)
          .fill()
          .map(() => Math.floor(Math.random() * 10)),
        color: () => `#28a745`,
        label: "TDS",
      },
      {
        data: Array(base)
          .fill()
          .map(() => Math.floor(Math.random() * 10)),
        color: () => `#17a2b8`,
        label: "Salinity",
      },
    ],
    legend: ["pH", "Temp", "TDS", "Salinity"],
  };
};

const alertLog = [
  {
    time: "4:45 PM",
    message: "Contaminants detected at dangerous levels.",
    type: "danger",
    icon: TestTube2,
  },
  {
    time: "3:20 PM",
    message: "TDS level exceeded safe threshold.",
    type: "warning",
    icon: Droplet,
  },
  {
    time: "12:00 PM",
    message: "Sudden pH drop detected.",
    type: "warning",
    icon: TestTube2,
  },
  {
    time: "9:00 AM",
    message: "High salinity warning triggered.",
    type: "warning",
    icon: Waves,
  },
  {
    time: "7:30 AM",
    message: "Temperature fluctuation beyond normal.",
    type: "info",
    icon: Thermometer,
  },
];

const alertColors = {
  danger: "#f8d7da",
  warning: "#fff3cd",
  info: "#d1ecf1",
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [rangeType, setRangeType] = useState("daily");
  const [filterType, setFilterType] = useState("all");

  const chartLabels = generateBarLabels(rangeType);
  const barData = generateBarData(chartLabels);
  const screenWidth = Dimensions.get("window").width;

  const filteredAlerts =
    filterType === "all"
      ? alertLog
      : alertLog.filter((a) => a.type === filterType);

  return (
    <SafeAreaView className="flex-1 bg-[#e6fbff]">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
          paddingTop: insets.top + 8,
        }}
        horizontal={false}
      >
        <View className="mb-4 items-start">
          <Image
            source={LOGO_PATH}
            style={globalStyles.logo}
            accessibilityLabel="app_logo"
          />
        </View>

        <Text className="text-sm font-bold text-gray-700 mb-2">
          Select Report Type
        </Text>
        <View className="flex-row justify-between mb-4">
          {["daily", "monthly", "annual"].map((type) => (
            <TouchableOpacity
              key={type}
              className={`flex-1 mx-1 p-3 rounded-xl shadow-sm ${
                rangeType === type ? "bg-blue-600" : "bg-white"
              }`}
              style={{
                shadowColor: "rgba(38, 55, 154, 0.15)",
              }}
              onPress={() => setRangeType(type)}
            >
              <Text
                className={`text-center font-semibold ${
                  rangeType === type ? "text-white" : "text-gray-700"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-sm font-bold text-gray-700 mb-3">
          Select Date Range
        </Text>
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            className="bg-white rounded-xl shadow-sm p-3 w-[48%]"
            onPress={() => setShowStart(true)}
          >
            <Text className="text-sm text-gray-600">Start Date</Text>
            <Text className="text-base font-semibold text-gray-800">
              {startDate.toDateString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-xl shadow-sm p-3 w-[48%]"
            onPress={() => setShowEnd(true)}
          >
            <Text className="text-sm text-gray-600">End Date</Text>
            <Text className="text-base font-semibold text-gray-800">
              {endDate.toDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showStart && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(_, d) => {
              setShowStart(false);
              if (d) setStartDate(d);
            }}
          />
        )}
        {showEnd && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(_, d) => {
              setShowEnd(false);
              if (d) setEndDate(d);
            }}
          />
        )}

        <Text className="text-sm font-bold text-gray-700 mb-2">
          Report Preview
        </Text>
        <ScrollView horizontal>
          <View
            className="bg-white rounded-xl shadow-sm p-4 mb-6"
            style={{ minWidth: screenWidth }}
          >
            <BarChart
              data={barData}
              width={chartLabels.length * 50}
              height={
                Math.max(...barData.datasets.flatMap((ds) => ds.data)) * 15 +
                100
              }
              fromZero
              withHorizontalLabels={true}
              withInnerLines={false}
              showBarTops={false}
              flatColor={true}
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1, index) =>
                  barData.datasets[
                    index % barData.datasets.length
                  ]?.color?.() || "#000",
                labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              }}
              style={{ borderRadius: 12 }}
            />
          </View>
        </ScrollView>

        <Text className="text-sm font-bold text-gray-700 mb-2">
          All Reports
        </Text>
        <View className="gap-4 mb-6">
          <View className="bg-white rounded-xl shadow-sm p-4">
            <View className="flex-row items-center mb-2 justify-between">
              <View className="flex-row items-center">
                <AlertCircle size={20} color="#dc3545" className="mr-3" />
                <Text className="text-base font-semibold text-gray-800">
                  Alerts Report
                </Text>
              </View>
              <View className="flex-row space-x-2">
                {["all", "danger", "warning", "info"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    className={`px-2 py-1 rounded-full ${
                      filterType === level ? "bg-blue-600" : "bg-gray-200"
                    }`}
                    onPress={() => setFilterType(level)}
                  >
                    <Text
                      className={`text-xs ${
                        filterType === level ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {filteredAlerts.map((a, idx) => {
              const Icon = a.icon || AlertCircle;
              return (
                <View
                  key={idx}
                  className="mb-2 rounded-lg px-3 py-2 flex-row items-center"
                  style={{ backgroundColor: alertColors[a.type] }}
                >
                  <Icon size={16} color="#333" className="mr-2" />
                  <View>
                    <Text className="text-xs text-gray-600">{a.time}</Text>
                    <Text className="text-sm text-gray-800 font-medium">
                      {a.message}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View className="bg-white rounded-xl shadow-sm p-4 flex-row items-center">
            <TrendIcon size={20} color="#007bff" className="mr-3" />
            <View>
              <Text className="text-base font-semibold text-gray-800 mb-1">
                Daily Trends
              </Text>
              <Text className="text-sm text-gray-600">
                Water parameter trends are included in the report preview.
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-sm font-bold text-gray-700 mb-2">Actions</Text>
        <View className="flex-row justify-between mb-6">
          <TouchableOpacity
            className="bg-green-600 rounded-xl p-3 mr-2 flex-1"
            onPress={() => alert("PDF Exported!")}
          >
            <Text className="text-white text-center font-semibold">
              Export as PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-cyan-600 rounded-xl p-3 ml-2 flex-1"
            onPress={() => alert("SVG Exported!")}
          >
            <Text className="text-white text-center font-semibold">
              Export as SVG
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
