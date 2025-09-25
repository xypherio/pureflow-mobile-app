import {
  BatteryFull,
  BatteryLow,
  Sun,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusCard({
  status = "Active",
  battery = "Normal",
  solarPowered = true // true = solar power, false = backup battery
}) {
  const isActive = status === "Active";
  const isBatteryLow = battery === "Low";

  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>DATM Status</Text>

      <View style={styles.pillsContainer}>
        {/* Timer Pill */}
        <View style={styles.pill}>
          <Timer size={18} color="#1c5c88" style={styles.icon} />
          <Text style={styles.timerText}>{countdown}s</Text>
        </View>

        {/* DATM Status Pill */}
        <View style={[styles.pill, { backgroundColor: isActive ? "#d4f8e8" : "#fce3e3" }]}>
          {isActive ? (
            <Wifi size={18} color="#28a745" style={styles.icon} />
          ) : (
            <WifiOff size={18} color="#e53935" style={styles.icon} />
          )}
        </View>

        {/* Unified Power Status Pill */}
        <View style={[styles.pill, { backgroundColor: solarPowered ? "#fff3cd" : (isBatteryLow ? "#f9d2d4" : "#d4f8e8") }]}>
          {solarPowered ? (
            <Sun size={18} color="#ffc107" style={styles.icon} />
          ) : isBatteryLow ? (
            <BatteryLow size={18} color="#c42d46" style={styles.icon} />
          ) : (
            <BatteryFull size={18} color="#28a745" style={styles.icon} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: "#2455a9",
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#f6fafd",
  },
  pillsContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap", 
    maxWidth: 280, 
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0ecff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  icon: {
    marginRight: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1c5c88",
    fontFamily: "Poppins",
  },
});
