import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { useAlertProcessor } from "../../hooks/useAlertProcessor";
import AlertCardItem from "./AlertCardItem";

/**
 * Optimized AlertsCard component - handles animation cycling through alerts
 * Processing logic moved to useAlertProcessor hook
 * Rendering logic moved to AlertCardItem component
 */
export default function AlertsCard({ alerts = [], realtimeData = null, interval = 4000 }) {
  const [current, setCurrent] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

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
    return [{
      id: 'default',
      parameter: "",
      type: "success",
      title: "All Parameters Normal",
      message: `All parameters (${keyParameters.join(", ")}) are within the normal range.`,
      isDefault: true
    }];
  }, [alerts, realtimeData, processAlerts, generateAlertsFromRealtimeData]);

  // Optimized animation logic - only runs when needed
  useEffect(() => {
    if (displayAlerts.length <= 1) return;

    let isMounted = true;
    const animateToNext = () => {
      if (!isMounted) return;

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 230,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(() => {
        if (!isMounted) return;
        setCurrent((prev) => (prev + 1) % displayAlerts.length);
        scaleAnim.setValue(1.05);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]).start();
      });
    };

    const timer = setInterval(animateToNext, interval);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [displayAlerts.length, interval, scaleAnim, opacityAnim]);

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
      <Animated.View
        style={{
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <AlertCardItem alert={alert} />
      </Animated.View>
    </View>
  );
}
