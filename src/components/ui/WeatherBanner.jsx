import { StyleSheet, Text, View } from "react-native";

export default function WeatherBanner({ forecast }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        🌧️ {forecast}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2455a9",
    borderRadius: 23,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  text: {
    fontSize: 12,
    color: "#ddeefc",
    fontWeight: "600",
  },
});
