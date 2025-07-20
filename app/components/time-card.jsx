import { Clock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { globalStyles } from "../styles/globalStyles";

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TimeCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        backgroundColor: "#f6fafd",
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        ...globalStyles.boxShadow,
      }}
    >
      <View
        style={{
          backgroundColor: "#2455a9",
          borderRadius: 12,
          width: 48,
          height: 48,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 18,
        }}
      >
        <Clock size={28} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#1c5c88",
            marginBottom: 2,
          }}
        >
          {formatDate(now)}
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#2455a9",
            letterSpacing: 1,
          }}
        >
          {formatTime(now)}
        </Text>
      </View>
    </View>
  );
}
