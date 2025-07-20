import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import NotificationFilter from "@components/alerts-filter";
import GlobalWrapper from "@components/global-wrapper";
import NotificationCard from "@components/notification-card";
import PureFlowLogo from "@components/ui-header";

const alertLevels = {
  red: { bg: "#fee2e2", iconColor: "#ef4444" },
  yellow: { bg: "#fef9c3", iconColor: "#eab308" },
  green: { bg: "#dcfce7", iconColor: "#22c55e" },
  blue: { bg: "#dbeafe", iconColor: "#3b82f6" },
};

const notifications = [
  {
    id: 1,
    title: "High pH Level",
    message: "Detected pH level of 9.1 in Pond B.",
    parameter: "ph",
    level: "red",
    type: "status",
  },
  {
    id: 2,
    title: "TDS Rising",
    message: "TDS level near unsafe limit (850 ppm).",
    parameter: "tds",
    level: "yellow",
    type: "status",
  },
  {
    id: 3,
    title: "Stable Temperature",
    message: "Water temperature is 25°C.",
    parameter: "temperature",
    level: "green",
    type: "status",
  },
  {
    id: 4,
    title: "Forecast Alert: Turbidity",
    message: "Trend shows spike in turbidity.",
    parameter: "turbidity",
    level: "yellow",
    type: "suggestion",
  },
  {
    id: 5,
    title: "Sensor Calibration",
    message: "TDS sensor not calibrated in 30+ days.",
    parameter: "tds",
    level: "blue",
    type: "status",
  },
  // 🆕 New Notifications Below
  {
    id: 6,
    title: "Low Salinity Alert",
    message: "Salinity level dropped to 2.1 ppt.",
    parameter: "salinity",
    level: "red",
    type: "status",
  },
  {
    id: 7,
    title: "Temperature Drop Forecast",
    message: "Expected 3°C temperature drop at midnight.",
    parameter: "temperature",
    level: "yellow",
    type: "suggestion",
  },
  {
    id: 8,
    title: "Turbidity Level Rising",
    message: "Turbidity may exceed safe range in 4 hours.",
    parameter: "turbidity",
    level: "yellow",
    type: "suggestion",
  },
  {
    id: 9,
    title: "pH Stabilized",
    message: "pH level returned to optimal range (7.0).",
    parameter: "ph",
    level: "green",
    type: "status",
  },
  {
    id: 10,
    title: "High Salinity Warning",
    message: "Salinity measured at 38 ppt — too high.",
    parameter: "salinity",
    level: "red",
    type: "status",
  },
  {
    id: 11,
    title: "Forecast: Mild Rainfall",
    message: "Rain expected to affect TDS by morning.",
    parameter: "tds",
    level: "blue",
    type: "suggestion",
  },
];


const groupByType = (notificationsList) => {
  const groups = {};
  notificationsList.forEach((notification) => {
    const type = notification.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(notification);
  });
  return groups;
};

export default function Alerts() {
  const navigation = useNavigation();

  const [selectedAlert, setSelectedAlert] = useState("all");
  const [selectedParam, setSelectedParam] = useState("all");

  const filteredNotifications = notifications.filter((item) => {
    const matchesAlert =
      selectedAlert === "all" || item.level === selectedAlert;
    const matchesParam =
      selectedParam === "all" || item.parameter === selectedParam;
    return matchesAlert && matchesParam;
  });

  const grouped = groupByType(filteredNotifications);

  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff]">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mb-4 items-start">
          <PureFlowLogo
            weather={{
              label: "Light Rain",
              temp: "30°C",
              icon: "partly",
            }}
          />
        </View>

        <NotificationFilter
          selectedAlert={selectedAlert}
          selectedParam={selectedParam}
          onSelectAlert={setSelectedAlert}
          onSelectParam={setSelectedParam}
        />

        {filteredNotifications.length > 0 ? (
          Object.entries(grouped).map(([type, items]) => (
            <View key={type} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: 8,
                  paddingHorizontal: 8,
                }}
              >
                {type === "status" ? "Status Alerts" : "Forecast Suggestions"}
              </Text>

              {items.map((item) => (
                <NotificationCard
                  key={item.id}
                  type={item.type}
                  title={item.title}
                  message={item.message}
                  parameter={item.parameter}
                  alertLevel={alertLevels[item.level]}
                  primaryLabel="Go to Forecast"
                  onPrimaryAction={() => navigation.navigate("forecast")}
                  onSecondaryAction={() => console.log("Later")}
                  onClose={() => console.log("Closed")}
                />
              ))}
            </View>
          ))
        ) : (
          <View
            style={{
              alignItems: "center",
              marginTop: 64,
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: "#007AFF",
                marginBottom: 8,
              }}
            >
              All Clear, Boyaks!
            </Text>
            <Text
              style={{ fontSize: 14, color: "#6b7280", textAlign: "center" }}
            >
              No notifications match your current filter. Your waters are steady
              and PureFlow is standing watch.
            </Text>
          </View>
        )}
      </ScrollView>
    </GlobalWrapper>
  );
}
