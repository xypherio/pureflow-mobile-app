import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { useData } from "@contexts/DataContext";

export default function RealTimeData({ data = [] }) {
  const { realtimeData } = useData();
  const [displayData, setDisplayData] = useState(null);
  
  // Use real-time data if available, otherwise fallback to latest from data array
  useEffect(() => {
    if (realtimeData) {
      setDisplayData(realtimeData);
      console.log('📊 Using real-time data:', realtimeData);
    } else if (data && data.length > 0) {
      const latest = data[data.length - 1];
      setDisplayData(latest);
      console.log('📊 Using fallback data:', latest);
    } else {
      setDisplayData(null);
    }
  }, [realtimeData, data]);
  
  const latest = displayData || {};

  const parameters = [
    {
      label: "pH Level",
      value: latest.pH !== undefined ? String(latest.pH) : "-",
      unit: "pH",
      icon: <Gauge size={30} color="#007bff" />, 
      color: "#007bff",
    },
    {
      label: "Temperature",
      value: latest.temperature !== undefined ? String(latest.temperature) : "-",
      unit: "°C",
      icon: <Thermometer size={30} color="#e83e8c" />, 
      color: "#e83e8c",
    },
    {
      label: "Turbidity",
      value: latest.turbidity !== undefined ? String(latest.turbidity) : "-",
      unit: "NTU",
      icon: <Droplet size={30} color="#28a745" />, 
      color: "#28a745",
    },
    {
      label: "Salinity",
      value: latest.salinity !== undefined ? String(latest.salinity) : "-",
      unit: "ppt",
      icon: <Waves size={30} color="#8b5cf6" />, 
      color: "#8b5cf6",
    },
  ];

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
