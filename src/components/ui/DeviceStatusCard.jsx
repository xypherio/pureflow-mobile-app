import {
  CloudDrizzle,
  CloudRain,
  Droplet,
  Sun,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusCard({
  isDatmActive: propIsDatmActive = true,
  isRaining = 0,
  humidity = null,
  lastDataTimestamp
}) {
  const [isDatmActive, setIsDatmActive] = useState(propIsDatmActive);
  const [dataStale, setDataStale] = useState(false);

  // Calculate freshness without side effects
  const checkDataFreshness = useCallback(() => {
    if (!lastDataTimestamp) {
      return { isStale: true, isActive: false }; 
    }

    const now = Date.now();
    const lastUpdate = new Date(lastDataTimestamp).getTime();
    const dataAge = now - lastUpdate;
    const isStale = dataAge > 60 * 1000; // 1 minute threshold
    
    return { isStale, isActive: !isStale };
  }, [lastDataTimestamp]);

  // Update state based on freshness check
  useEffect(() => {
    const updateStatus = () => {
      const { isStale, isActive } = checkDataFreshness();
      setDataStale(isStale);
      setIsDatmActive(isActive);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [checkDataFreshness]);

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const syncCountdown = () => {
      const now = Date.now();
      const remainder = now % 30000;
      const remainingSeconds = Math.ceil((30000 - remainder) / 1000);

      setCountdown(remainingSeconds === 0 ? 30 : remainingSeconds);
    };

    syncCountdown();

    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>DATM</Text>

      <View style={styles.pillsContainer}>
        {/* Timer Pill */}
        <View style={styles.pill}>
          <Timer size={18} color="#1c5c88" style={styles.icon} />
          <Text style={styles.timerText}>{countdown}s</Text>
        </View>

        {/* DATM Status Pill */}
        <View style={[styles.pill, { backgroundColor: isDatmActive ? "#d4f8e8" : "#fce3e3" }]}>
          {isDatmActive ? (
            <Wifi size={18} color="#28a745" style={styles.icon} />
          ) : (
            <WifiOff size={18} color="#e53935" style={styles.icon} />
          )}
        </View>

        {/* Weather Status Pill */}
        <View style={[styles.pill, { backgroundColor:
          isRaining === 0 ? "#fff3cd" : // Yellow for sunny/not raining
          isRaining === 1 ? "#cce4ff" : // Light blue for light rain
          "#99cfff" // Medium blue for heavy rain
        }]}>
          {isRaining === 0 ? (
            <Sun size={18} color="#ffc107" style={styles.icon} />
          ) : isRaining === 1 ? (
            <CloudDrizzle size={18} color="#1565c0" style={styles.icon} />
          ) : (
            <CloudRain size={18} color="#0d47a1" style={styles.icon} />
          )}
        </View>

        {/* Humidity Pill */}
        <View style={[styles.pill, { backgroundColor: '#e6f3ff' }]}>
          <Droplet size={16} color="#0d6efd" style={styles.icon} />
          <Text style={[styles.timerText, { color: '#0d6efd' }]}>
            {humidity !== null ? `${Math.round(humidity)}%` : '--%'}
          </Text>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
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
