import { globalStyles } from "@styles/globalStyles.js";
import { ArrowUpRight, Thermometer } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function HeadsUpBanner({ message, temperatureRise = 5 }) {
  return (
    <View style={styles.container}>
      {/* Background Arrow */}
      <ArrowUpRight
        size={100}
        color="rgba(232, 62, 140, 0.08)"
        style={styles.backgroundArrow}
      />

      <View style={styles.contentRow}>
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <Thermometer size={24} color="#ffffff" />
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.titleText}>Temperature Alert</Text>
            <Text style={styles.dateText}>Today</Text>
          </View>

          <Text style={styles.messageText}>
            {message || (
              <>
                <Text style={styles.highlightedText}>
                  +{temperatureRise}°C
                </Text>{" "}
                rise in temperature at{" "}
                <Text style={styles.highlightedText}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    position: "relative",
    ...globalStyles.boxShadow,
  },
  backgroundArrow: {
    position: "absolute",
    bottom: -5,
    right: -5,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    backgroundColor: "#e83e8c",
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 18,
    color: "#1f2937",
    fontWeight: "700",
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  messageText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 22,
  },
  highlightedText: {
    backgroundColor: "#c2e3fb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 18,
    marginHorizontal: 2,
  },
});
