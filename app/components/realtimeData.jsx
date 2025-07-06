import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import { Text, View } from "react-native";

const parameters = [
  {
    label: "pH Level",
    value: "7.2",
    unit: "pH",
    icon: <Gauge size={30} color="#007bff" />,
    color: "#007bff",
  },
  {
    label: "Temperature",
    value: "25",
    unit: "°C",
    icon: <Thermometer size={30} color="#e83e8c" />,
    color: "#e83e8c",
  },
  {
    label: "TDS",
    value: "500",
    unit: "ppm",
    icon: <Droplet size={30} color="#28a745" />,
    color: "#28a745",
  },
  {
    label: "Salinity",
    value: "35",
    unit: "ppt",
    icon: <Waves size={30} color="#17a2b8" />,
    color: "#17a2b8",
  },
];

export default function RealTimeData() {
  return (
    <View
      style={{
        backgroundColor: "#224882",
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 12,
          columnGap: 12,
        }}
      >
        {parameters.map((param, index) => (
          <View
            key={index}
            style={{
              backgroundColor: "#f6fafd",
              borderRadius: 12,
              padding: 12,
              height: 150,
              flexBasis: "48%",
              flexShrink: 0,
              justifyContent: "space-between",
            }}
          >
            <View>
              {param.icon}
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: param.color,
                    marginRight: 4,
                  }}
                >
                  {param.value}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: param.color,
                  }}
                >
                  {param.unit}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: "#6cc9f5",
                fontSize: 16,
                marginTop: 4,
              }}
            >
              {param.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
