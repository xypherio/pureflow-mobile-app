import { useData } from "@contexts/DataContext";
import {
  CloudDrizzle,
  CloudRain,
  Sun,
  Timer,
  Wifi,
  WifiOff
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusCard({
  isDatmActive: propIsDatmActive = false,
  isRaining = 0,
  temperature = null,
  lastDataTimestamp
}) {
  const { realtimeData, generateDataSignature } = useData();
  const [isDatmActive, setIsDatmActive] = useState(propIsDatmActive);
  const timeoutRef = useRef();
  const lastProcessedDataSignatureRef = useRef(null);

  // Check if we have valid water quality data (matching RealtimeDataCards logic)
  const hasData =
    realtimeData &&
    (realtimeData.pH !== undefined ||
      realtimeData.temperature !== undefined ||
      realtimeData.turbidity !== undefined ||
      realtimeData.salinity !== undefined ||
      realtimeData.reading?.pH !== undefined ||
      realtimeData.reading?.temperature !== undefined ||
      realtimeData.reading?.turbidity !== undefined ||
      realtimeData.reading?.salinity !== undefined);

  // Monitor for new data triggers (aligning with RealtimeDataCards rendering)
  useEffect(() => {
    if (realtimeData && hasData && generateDataSignature) {
      // Extract actual sensor data for signature generation
      const actualSensorData = realtimeData.reading || realtimeData;

      // Generate data signature to detect actual value changes
      const currentDataSignature = generateDataSignature(actualSensorData);
      const hasDataChanged = currentDataSignature !== lastProcessedDataSignatureRef.current;

      if (hasDataChanged) {
        console.log('🔄 DeviceStatusCard: Sensor data changed, marking DATM active', {
          currentSignature: currentDataSignature,
          lastSignature: lastProcessedDataSignatureRef.current
        });

        // New sensor data values received - mark DATM as active
        setIsDatmActive(true);
        lastProcessedDataSignatureRef.current = currentDataSignature;

        // Clear existing timeout and set new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Set timeout to mark inactive after 3 minutes without new data that RealtimeDataCards renders
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ DeviceStatusCard: Timeout reached, marking DATM inactive');
          setIsDatmActive(false);
        }, 180000); // 3 minutes
      } else {
        console.log('🔄 DeviceStatusCard: Sensor data unchanged, keeping existing timeout');
      }
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [realtimeData, hasData, generateDataSignature]);

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
        <View style={[styles.pill, { backgroundColor: '#f3e5f5' }]}>
          <Timer size={18} color="#7b1fa2" style={styles.icon} />
          <Text style={[styles.timerText, { color: '#7b1fa2' }]}>{countdown}s</Text>
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
    paddingVertical: 10,
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
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0ecff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
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
