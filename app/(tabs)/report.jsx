import ExportToggleButton from "@components/export-toggle-button";
import GlobalWrapper from "@components/global-wrapper";
import InsightsCard from "@components/insights-card";
import LineChartCard from "@components/linechart-card";
import ParameterGridCard from "@components/parameter-grid-card";
import SegmentedFilter from "@components/segmented-filters";
import PureFlowLogo from "@components/ui-header";
import WaterQualitySummaryCard from "@components/water-quality-summary-card";

import { format } from 'date-fns';
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function ReportScreen() {
  const [activeFilter, setActiveFilter] = useState("Daily");
  const [chartData, setChartData] = useState(null);
  const [gridData, setGridData] = useState([]);
  const [summaryData, setSummaryData] = useState({ qualityLevel: "Good", lastUpdated: "N/A" });
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);

  const timePeriodOptions = ["Daily", "Weekly", "Monthly", "Annually"];

  const insights = [
    {
      type: "positive",
      title: "Water Quality Excellent",
      description:
        "All major parameters are within optimal ranges. Your water system is performing well.",
      timestamp: "2 hours ago",
    },
    {
      type: "warning",
      title: "Turbidity Slightly Elevated",
      description:
        "Turbidity levels are above normal but still within acceptable limits. Consider checking your filtration system.",
      action: "View Details",
      timestamp: "4 hours ago",
    },
    {
      type: "info",
      title: "Weekly Report Available",
      description:
        "Your comprehensive weekly water quality report is ready for download.",
      action: "Download",
      timestamp: "1 day ago",
    },
  ];

  const handleParameterPress = (parameter) => {
    console.log(`Pressed ${parameter}`);
  };

  const handleExportAction = (actionId) => {
    console.log(`Export action: ${actionId}`);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // DUMMY DATA FOR DEMO PURPOSES
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      // Dummy sensor data
      const dummySensorData = [
        {
          id: "1",
          ph: 7.2,
          temperature: 25,
          tds: 320,
          salinity: 0.5,
          timestamp: new Date(),
        },
        {
          id: "2",
          ph: 7.0,
          temperature: 26,
          tds: 310,
          salinity: 0.4,
          timestamp: new Date(Date.now() - 3600 * 1000),
        },
        {
          id: "3",
          ph: 7.5,
          temperature: 24,
          tds: 330,
          salinity: 0.6,
          timestamp: new Date(Date.now() - 2 * 3600 * 1000),
        },
      ];
      setSensorData(dummySensorData);
      setLoading(false);
    }, 800);
  }, [activeFilter]);

  useEffect(() => {
    if (sensorData.length > 0) {
      processData(sensorData, activeFilter);
    } else {
      setChartData(null);
      setGridData([]);
    }
  }, [sensorData, activeFilter]);

  const processData = (data, filter) => {
    const chartResult = processChartData(data, filter);
    setChartData(chartResult);

    if (data.length > 0) {
      const latestData = data[0];
      const newGridData = [
        { parameter: "pH", value: latestData.ph, status: getStatus(latestData.ph, "pH") },
        { parameter: "Temperature", value: latestData.temperature, status: getStatus(latestData.temperature, "Temperature") },
        { parameter: "TDS", value: latestData.tds, status: getStatus(latestData.tds, "TDS") },
        { parameter: "Salinity", value: latestData.salinity, status: getStatus(latestData.salinity, "Salinity") },
      ];
      setGridData(newGridData);
      setSummaryData({
        qualityLevel: getOverallQuality(newGridData),
        lastUpdated: format(latestData.timestamp, "p, MMM d")
      })
    } else {
      setGridData([]);
    }
  };

  const processChartData = (data, filter) => {
    if (!data || data.length === 0) return null;
  
    const getGroupKey = (date, filter) => {
      switch (filter) {
        case 'Daily':
          return format(date, 'HH:00');
        case 'Weekly':
          return format(date, 'eeee');
        case 'Monthly':
          return format(date, 'dd');
        case 'Annually':
          return format(date, 'MMMM');
        default:
          return format(date, 'yyyy-MM-dd');
      }
    };
  
    const groupedData = data.reduce((acc, curr) => {
      const groupKey = getGroupKey(curr.timestamp, filter);
      if (!acc[groupKey]) {
        acc[groupKey] = { ph: [], temperature: [], tds: [], salinity: [], count: 0 };
      }
      acc[groupKey].ph.push(curr.ph);
      acc[groupKey].temperature.push(curr.temperature);
      acc[groupKey].tds.push(curr.tds);
      acc[groupKey].salinity.push(curr.salinity);
      acc[groupKey].count++;
      return acc;
    }, {});
  
    const labels = Object.keys(groupedData);
    const datasets = [
      {
        name: 'pH',
        data: labels.map(label => average(groupedData[label].ph)),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      },
      {
        name: 'Temperature',
        data: labels.map(label => average(groupedData[label].temperature)),
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
      },
      {
        name: 'TDS',
        data: labels.map(label => average(groupedData[label].tds)),
        color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      },
      {
        name: 'Salinity',
        data: labels.map(label => average(groupedData[label].salinity)),
        color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      },
    ];
  
    return { labels, datasets };
  };
  
  const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const getStatus = (value, parameter) => {
    const thresholds = {
        pH: { normal: [6.5, 8.5] },
        Temperature: { normal: [20, 30] },
        TDS: { normal: [0, 500] },
        Salinity: { normal: [0, 1] },
    };
    const range = thresholds[parameter]?.normal;
    if (range && value >= range[0] && value <= range[1]) {
        return "normal";
    }
    return "warning";
  };

  const getOverallQuality = (gridData) => {
    const statuses = gridData.map(d => d.status);
    if (statuses.some(s => s === 'warning')) return 'Poor';
    if (statuses.every(s => s === 'normal')) return 'Excellent';
    return 'Good';
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <GlobalWrapper style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          <View style={{ alignItems: "flex-start" }}>
            <PureFlowLogo
              weather={{
                label: "Light Rain",
                temp: "30°C",
                icon: "partly",
              }}
            />
          </View>

          <View style={{ marginBottom: -5 }}>
            <SegmentedFilter
              options={timePeriodOptions}
              activeFilter={activeFilter}
              setActiveFilter={handleFilterChange}
            />
          </View>

          <View style={{ marginBottom: 5 }}>
            <WaterQualitySummaryCard
              qualityLevel={summaryData.qualityLevel}
              lastUpdated={summaryData.lastUpdated}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: "#1a2d51",
                  marginTop: 5,
                  marginBottom: 5,
                }}
              >
                Key Parameters
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 12,
                columnGap: 12,
              }}
            >
              {gridData.length > 0 ? gridData.map((param, index) => (
                <View
                  key={index}
                  style={{
                    width: "48%",
                    height: 150,
                  }}
                >
                  <ParameterGridCard
                    parameter={param.parameter}
                    value={param.value}
                    status={param.status}
                    onPress={() => handleParameterPress(param.parameter)}
                  />
                </View>
              )) : <Text>No data available for this period.</Text>}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: "#1a2d51" }}>
              Historical Data
            </Text>
          </View>
          <View style={{ marginBottom: 24, marginTop: -10 }}>
            <LineChartCard data={chartData} loading={loading} />
          </View>

          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: "#1a2d51" }}>
                Insights & Recommendations
              </Text>
            </View>

            {insights.map((insight, index) => (
              <InsightsCard
                key={index}
                type={insight.type}
                title={insight.title}
                description={insight.description}
                action={insight.action}
                onActionPress={() => handleExportAction(insight.action)}
                timestamp={insight.timestamp}
              />
            ))}
          </View>
        </ScrollView>
      </GlobalWrapper>

      <ExportToggleButton onExportAction={handleExportAction} />
    </View>
  );
}
