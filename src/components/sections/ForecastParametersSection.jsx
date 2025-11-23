import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

// Components
import ForecastCard from "@dataDisplay/ForecastCard";

// Utils
import { formatValue, FORECAST_PARAMETERS, getParameterTheme } from "@utils/forecastUtils";

const ForecastParameters = ({
  forecastPredicted,
  selectedParam,
  setSelectedParam,
  trends = {},
  containerStyle = {}
}) => {
  return (
    <View style={[styles.forecastParametersContainer, containerStyle]}>
      <Text style={styles.sectionTitle}>Forecast Parameters</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FORECAST_PARAMETERS.map(({ key }) => (
          <ForecastCard
            key={key}
            title={key}
            value={formatValue(key, forecastPredicted?.[key])}
            trend={trends[key] || 'stable'}
            onPress={() => setSelectedParam(key)}
            breachPredicted={false} // Remove if not used
            containerStyle={selectedParam === key ? { shadowColor: getParameterTheme(key).color } : {}}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  forecastParametersContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51",
    fontWeight: "600",
    marginBottom: 8,
  },
});

export default ForecastParameters;
