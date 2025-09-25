import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../constants/colors";

export default function SegmentedFilter({
  options = [],
  selectedValue,
  onValueChange,
  style,
}) {
  const getParameterColor = (parameter) => {
    const parameterColors = {
      ph: colors.phColor,
      temperature: colors.tempColor,
      turbidity: colors.turbidityColor,
      salinity: colors.salinityColor,
    };
    return parameterColors[parameter?.toLowerCase()] || colors.primary;
  };

  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        const paramColor = getParameterColor(option.value);

        // Handle both text and icon elements
        const renderLabel = () => {
          if (React.isValidElement(option.label)) {
            // For icon elements, clone with selected color
            return React.cloneElement(option.label, {
              color: isSelected ? "#FFFFFF" : option.label.props.color,
            });
          } else {
            // For text labels, wrap in Text component
            return (
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
            );
          }
        };

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onValueChange(option.value)}
            style={[
              styles.option,
              index === 0 && styles.firstOption,
              index === options.length - 1 && styles.lastOption,
              isSelected && { backgroundColor: paramColor },
            ]}
          >
            {renderLabel()}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#f0f8fe",
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: "#2d7ee3",
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    color: colors.text,
    textAlign: "center",
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
  firstOption: {
    marginRight: 2,
  },
  lastOption: {
    marginLeft: 2,
  },
});
