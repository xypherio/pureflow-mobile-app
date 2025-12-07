import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useAlertProcessor } from "../../hooks/useAlertProcessor";
import AlertCardItem from "./AlertCardItem";

export default function AlertsCard({
  alerts = [],
  realtimeData = null,
  interval = 3500,
}) {
  const [current, setCurrent] = useState(0);

  // Use the alert processing hook
  const { processAlerts, generateAlertsFromRealtimeData } = useAlertProcessor();

  // Process alerts using the hook
  const displayAlerts = useMemo(() => {
    // First, try to use alerts from props
    let processedAlerts = processAlerts(alerts);

    // If no alerts from props but we have realtimeData, generate alerts from it
    if (processedAlerts.length === 0 && realtimeData) {
      const generatedAlerts = generateAlertsFromRealtimeData(realtimeData);
      processedAlerts = processAlerts(generatedAlerts);
    }

    if (processedAlerts.length > 0) {
      return processedAlerts;
    }

    // Default alert when no active alerts
    const keyParameters = ["pH", "Temperature", "Salinity"];
    return [
      {
        id: "default",
        parameter: "",
        type: "success",
        title: "All Parameters Normal",
        message: `All parameters (${keyParameters.join(", ")}) are within the normal range.`,
        isDefault: true,
      },
    ];
  }, [alerts, realtimeData, processAlerts, generateAlertsFromRealtimeData]);


  useEffect(() => {
    if (displayAlerts.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % displayAlerts.length);
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [displayAlerts.length, interval]);

  // Reset current index when alerts change
  useEffect(() => {
    setCurrent(0);
  }, [alerts]);

  if (!displayAlerts.length) {
    return null;
  }

  const alert = displayAlerts[current];
  if (!alert) return null;

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <AlertCardItem alert={alert} />
    </View>
  );
}
