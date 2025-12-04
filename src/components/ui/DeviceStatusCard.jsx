import {
  CloudDrizzle,
  CloudRain,
  Droplet,
  Sun,
  Timer,
  Wifi,
  WifiOff
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusCard({
  isDatmActive: propIsDatmActive = true,
  isRaining = 0,
  humidity = null,
  temperature = null,
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

  // Debug: Verify temperature is still being received correctly
  // console.log('🔧 DeviceStatusCard - temperature prop:', temperature);

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
      {/* Row 1: DATM Status Banner (full width) */}
      <View style={[styles.datmStatusBanner, {
        backgroundColor: isDatmActive ? "#d4f8e8" : "#fce3e3"
      }]}>
        <View style={styles.datmStatusContent}>
          <Text style={[styles.datmStatusText, {
            color: isDatmActive ? "#28a745" : "#e53935"
          }]}>
            DATM Status
          </Text>
          {isDatmActive ? (
            <Wifi size={18} color="#28a745" />
          ) : (
            <WifiOff size={18} color="#e53935" />
          )}
        </View>
      </View>

      {/* Row 2: Status Pills */}
      <View style={styles.pillsContainer}>
        {/* Timer Pill */}
        <View style={[styles.pill, { backgroundColor: '#efe9fe' }]}>
          <Timer size={18} color="#8b5cf6" style={styles.icon} />
          <Text style={[styles.timerText, { color: '#8b5cf6' }]}>{countdown}s</Text>
        </View>

        {/* Humidity Pill */}
        <View style={[styles.pill, { backgroundColor: '#e6f3ff' }]}>
          <Droplet size={16} color="#0d6efd" style={styles.icon} />
          <Text style={[styles.timerText, { color: '#0d6efd' }]}>
            {humidity !== null ? `${Math.round(humidity)}%` : '--%'}
          </Text>
        </View>

        {/* Weather Status Pill */}
        <View style={[styles.pill, { backgroundColor:
          isRaining === 0 ? "#fff3cd" : // Yellow for sunny/not raining
          isRaining === 1 ? "#cce4ff" : // Light blue for light rain
          "#99cfff" // Medium blue for heavy rain
        }]}>
          {isRaining === 0 ? (
            <Sun size={18} color="#dd6e02" style={styles.icon} />
          ) : isRaining === 1 ? (
            <CloudDrizzle size={18} color="#1565c0" style={styles.icon} />
          ) : (
            <CloudRain size={18} color="#0d47a1" style={styles.icon} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100, 
    backgroundColor: "#2455a9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "column", 
    justifyContent: "space-between",
    marginTop: 5,
    gap: 5,
  },
  datmStatusBanner: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'stretch', 
  },
  datmStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datmStatusText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  pillsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: '100%', 
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", 
    backgroundColor: "#e0ecff",
    paddingHorizontal: 12, 
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1, 
    marginHorizontal: 5,
    fontWeight: "700"
  },
  icon: {
    marginRight: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1c5c88",
    fontFamily: "Poppins",
  },
});
