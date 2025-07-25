import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import NotificationFilter from "@components/alerts-filter";
import GlobalWrapper from "@components/global-wrapper";
import NotificationCard from "@components/notification-card";
import PureFlowLogo from "@components/ui-header";
import { useAlerts } from "../../contexts/AlertContext";

const alertLevels = {
  red: { bg: "#fee2e2", iconColor: "#ef4444" },
  yellow: { bg: "#fef9c3", iconColor: "#eab308" },
  green: { bg: "#dcfce7", iconColor: "#22c55e" },
  blue: { bg: "#dbeafe", iconColor: "#3b82f6" },
};

export default function Alerts() {
  const { allAlerts, loading, error } = useAlerts();
  const navigation = useNavigation();
  const [selectedAlert, setSelectedAlert] = useState("all");
  const [selectedParam, setSelectedParam] = useState("all");

  const filteredNotifications = allAlerts.filter((item) => {
    const matchesAlert =
      selectedAlert === "all" || item.type === selectedAlert;
    const matchesParam =
      selectedParam === "all" || item.parameter === selectedParam;
    return matchesAlert && matchesParam;
  });

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
          filteredNotifications.map((item) => (
            <NotificationCard
              key={item.parameter + item.type}
              type={item.type}
              title={item.title}
              message={item.message}
              parameter={item.parameter}
              alertLevel={{ bg: '#F3F4F6', iconColor: '#007AFF' }}
              primaryLabel="Go to Forecast"
              onPrimaryAction={() => navigation.navigate("forecast")}
              onSecondaryAction={() => console.log("Later")}
              onClose={() => console.log("Closed")}
            />
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
              All Clear!
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
