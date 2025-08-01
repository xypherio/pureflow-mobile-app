import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const defaultOptions = ["pH", "Temp", "TDS", "Salinity"];

export default function SegmentedFilter({
  options = defaultOptions,
  activeFilter,
  setActiveFilter,
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "#2455a9",
          borderRadius: 15,
          backgroundColor: "#f6fafd",
          padding: 3,
        }}
      >
        {options.map((filter, index) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => setActiveFilter(filter)}
              style={{
                flex: 1,
                backgroundColor: isActive ? "#2455a9" : "transparent",
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: isActive ? 12 : 12,
                marginHorizontal: isActive ? 2 : 0,
                // Add a subtle shadow for the active pill (optional)
                ...(isActive
                  ? {
                      shadowColor: "midnightblue",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 4,
                    }
                  : {}),
              }}
            >
              <Text
                style={{
                  color: isActive ? "#f6fafd" : "#2455a9",
                  fontWeight: "600",
                  fontSize: 14,
                  fontFamily: "Poppins",
                }}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Example inside SegmentedFilter */}
        <TouchableOpacity onPress={() => setActiveFilter("Monthly")}>
          <Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const [activeFilter, setActiveFilter] = React.useState("Weekly");
