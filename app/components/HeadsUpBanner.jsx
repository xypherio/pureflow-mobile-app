import { ArrowUpRight, Thermometer } from "lucide-react-native";
import { Text, View } from "react-native";
import { globalStyles } from "../styles/globalStyles";

export default function HeadsUpBanner({ message, temperatureRise = 5 }) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
        position: "relative",
        ...globalStyles.boxShadow,  
      }}
    >
      {/* Background Arrow */}
      <ArrowUpRight
        size={100}
        color="rgba(232, 62, 140, 0.08)"
        style={{ position: "absolute", bottom: -5, right: -5 }}
      />

      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Icon Container */}
        <View
          style={{
            backgroundColor: "#e83e8c",
            borderRadius: 12,
            width: 48,
            height: 48,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <Thermometer size={24} color="#ffffff" />
        </View>

        {/* Content Container */}
        <View style={{ flex: 1, justifyContent: "center", minHeight: 48 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                color: "#1f2937",
                fontWeight: "700",
                flex: 1,
              }}
            >
              Temperature Alert
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              Today
            </Text>
          </View>

          <Text
            style={{
              fontSize: 16,
              color: "#374151",
              lineHeight: 22,
            }}
          >
            {message || (
              <>
                <Text
                  style={{
                    backgroundColor: "#c2e3fb",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    color: "#1e40af",
                    fontWeight: "700",
                    fontSize: 18,
                    marginHorizontal: 2,
                  }}
                >
                  +{temperatureRise}°C
                </Text>{" "}
                rise in temperature at{" "}
                <Text
                  style={{
                    backgroundColor: "#c2e3fb",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    color: "#1e40af",
                    fontWeight: "700",
                    fontSize: 18,
                    marginHorizontal: 2,
                  }}
                >
                  2PM
                </Text>
              </>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}
