/** ForecastDataSourceIndicatorSection - Shows forecast data source indicators and information */
import { getDataSourceInfo } from "@utils/forecastUtils";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const DataSourceIndicator = ({ forecastDataAvailable, dataSource }) => {
  const dataSourceText = getDataSourceInfo(dataSource);

  if (!forecastDataAvailable || !dataSourceText) {
    return null;
  }

  return (
    <View style={styles.dataSourceContainer}>
      <Text style={styles.dataSourceText}>
        📊 {dataSourceText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dataSourceContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
  },
  dataSourceText: {
    color: "#2455a9",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default DataSourceIndicator;
