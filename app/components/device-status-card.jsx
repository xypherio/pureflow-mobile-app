import {
  BatteryFull,
  BatteryLow,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function StatusCard({ status = "Active", battery = "Normal" }) {
  const isActive = status === "Active";
  const isBatteryLow = battery === "Low";

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        height: 64,
        backgroundColor: "#f6fafd",
        borderRadius: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Text
        style={{
          fontFamily: "Poppins",
          fontSize: 16,
          fontWeight: "600",
          color: "#1c5c88",
        }}
      >
        DATM Status
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {/* Timer Pill */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#e0ecff",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Timer size={18} color="#1c5c88" style={{ marginRight: 6 }} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#1c5c88",
              fontFamily: "Poppins",
            }}
          >
            {countdown}s
          </Text>
        </View>

        {/* DATM Status Pill */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isActive ? "#d4f8e8" : "#fce3e3",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          {isActive ? (
            <Wifi size={18} color="#28a745" style={{ marginRight: 6 }} />
          ) : (
            <WifiOff size={18} color="#e53935" style={{ marginRight: 6 }} />
          )}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: isActive ? "#28a745" : "#e53935",
              fontFamily: "Poppins",
            }}
          ></Text>
        </View>

        {/* Battery Status Pill */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isBatteryLow ? "#f9d2d4" : "#d4f8e8",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          {isBatteryLow ? (
            <BatteryLow size={18} color="#c42d46" style={{ marginRight: 6 }} />
          ) : (
            <BatteryFull size={18} color="#28a745" style={{ marginRight: 6 }} />
          )}
        </View>
      </View>
    </View>
  );
}
