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
    icon: <Waves size={30} color="#8b5cf6" />,
    color: "#8b5cf6",
  },
];

export default function RealTimeData() {
  return (
    <View
      style={{
        backgroundColor: "#2455a9",
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
                    fontSize: 50,
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
                    paddingBottom: 10,
                    color: param.color,
                  }}
                >
                  {param.unit}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: "#224882",
                fontSize: 13,
                marginTop: 2,
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
