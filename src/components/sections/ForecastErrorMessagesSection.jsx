import React from "react";
import { StyleSheet, Text, View } from "react-native";

const ForecastErrorMessages = ({ predictionError, hasEverFetchedOnce, forecastDataAvailable }) => {
  if (predictionError && hasEverFetchedOnce) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          <Text style={{ fontWeight: "bold" }}>
            Unable to update forecast:
          </Text>{" "}
          {predictionError}. Showing last available forecast data.
        </Text>
      </View>
    );
  }

  if (predictionError && !hasEverFetchedOnce) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>
          Please come back later when the forecast is available.
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#F2DEDE",
  },
  errorText: {
    color: "#A94442",
    fontSize: 12,
  },
  noDataContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 5,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  noDataText: {
    color: "#856404",
    fontSize: 12,
    textAlign: "center",
  },
});

export default ForecastErrorMessages;
