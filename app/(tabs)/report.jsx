import ExportToggleButton from "@components/export-toggle-button";
import GlobalWrapper from "@components/global-wrapper";
import InsightsCard from "@components/insights-card";
import LineChartCard from "@components/linechart-card";
import ParameterGridCard from "@components/parameter-grid-card";
import SegmentedFilter from "@components/segmented-filters";
import PureFlowLogo from "@components/ui-header";
import WaterQualitySummaryCard from "@components/water-quality-summary-card";

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function ReportScreen() {
  const [activeFilter, setActiveFilter] = useState("Daily");

  const timePeriodOptions = ["Daily", "Weekly", "Monthly", "Annually"];

  // Sample data for 2x2 grid - showing only 4 key parameters
  const parameters = [
    { parameter: "pH", value: 7.2, status: "normal" },
    { parameter: "Temperature", value: 25.5, status: "normal" },
    { parameter: "TDS", value: 180, status: "normal" },
    { parameter: "Salinity", value: 0.5, status: "normal" },
  ];

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
    // Handle parameter card press - could navigate to detailed view
    console.log(`Pressed ${parameter}`);
  };

  const handleExportAction = (actionId) => {
    // Handle export action button press
    console.log(`Export action: ${actionId}`);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    console.log(`Selected time period: ${filter}`);
    // Here you can add logic to fetch data based on the selected time period
  };

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <GlobalWrapper style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {/* Header */}
          <View style={{ alignItems: "flex-start" }}>
            <PureFlowLogo
              weather={{
                label: "Light Rain",
                temp: "30°C",
                icon: "partly",
              }}
            />
          </View>

          {/* Time Period Filter */}
          <View style={{ marginBottom: -5 }}>
            <SegmentedFilter
              options={timePeriodOptions}
              activeFilter={activeFilter}
              setActiveFilter={handleFilterChange}
            />
          </View>

          {/* Water Quality Summary */}
          <View style={{ marginBottom: 5 }}>
            <WaterQualitySummaryCard
              qualityLevel="Poor"
              lastUpdated="2 hours ago"
            />
          </View>

          {/* Parameter Grid - 2x2 Layout */}
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
              {parameters.map((param, index) => (
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
              ))}
            </View>
          </View>

          {/* Historical Data */}
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
            <LineChartCard />
          </View>

          {/* Insights & Recommendations */}
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

      {/* Floating Export Toggle Button - Outside ScrollView for true sticky behavior */}
      <ExportToggleButton onExportAction={handleExportAction} />
    </View>
  );
}
