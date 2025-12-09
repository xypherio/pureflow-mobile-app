/** ForecastParametersSection - Scrollable list of forecast parameter cards showing predicted values and trends */
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

// Components
import ForecastCard from "@dataDisplay/ForecastCard";

// Utils
import { FORECAST_PARAMETERS, formatValue, getParameterTheme } from "@utils/forecastUtils";

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
    marginBottom: 15,
    marginTop: 15
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51",
    marginBottom: 10,
  },
});

export default ForecastParameters;
