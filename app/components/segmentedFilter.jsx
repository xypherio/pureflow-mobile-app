import { Text, TouchableOpacity, View } from "react-native";

const defaultOptions = ["pH", "Temp", "TDS", "Salinity"];

export default function SegmentedFilter({
  options = defaultOptions,
  activeFilter,
  setActiveFilter,
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {/* Label above filter */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#1c5c88",
          marginBottom: 8,
          fontFamily: "Poppins",
        }}
      >
        Overview Chart
      </Text>

      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "#1c5c88",
          borderRadius: 8,
          overflow: "hidden",
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
                backgroundColor: isActive ? "#1c5c88" : "#f6fafd",
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: isActive ? "#f6fafd" : "#1c5c88",
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
      </View>
    </View>
  );
}
