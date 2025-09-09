import { getWaterQualityThresholds } from "@constants/thresholds";
import { useData } from "@contexts/DataContext";
import { Droplet, Gauge, Thermometer, Waves } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const thresholds = getWaterQualityThresholds();

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2455a9",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  parametersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
  },
  parameterCard: {
    backgroundColor: "#f6fafd",
    borderRadius: 12,
    padding: 12,
    height: 160,
    flexBasis: "48%",
    flexShrink: 0,
    justifyContent: "space-between",
  },
  iconValueContainer: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    marginTop: 8 
  },
  valueText: {
    fontSize: 50,
    fontWeight: "bold",
    marginRight: 4,
  },
  unitText: {
    fontSize: 20,
    fontWeight: "bold",
    paddingBottom: 10,
  },
  labelText: {
    color: "#224882",
    fontSize: 14,
    marginTop: 2,
  },
  thresholdText: {
    color: "rgb(36, 85, 169, 0.2)",
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic",
  },
});

export default function RealTimeData({ data = [] }) {
  const { realtimeData } = useData();
  const [displayData, setDisplayData] = useState(0);
  
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
      setDisplayData(0);
    }
  }, [realtimeData, data]);
  
  const latest = displayData || {};

  const parameters = [
    {
      label: "pH Level",
      value: latest.pH !== undefined ? String(latest.pH) : "0",
      unit: "pH",
      icon: <Gauge size={30} color="#007bff" />,
      color: "#007bff",
      threshold: thresholds["pH"],
    },
    {
      label: "Temperature",
      value: latest.temperature !== undefined ? String(latest.temperature) : "0",
      unit: "°C",
      icon: <Thermometer size={30} color="#e83e8c" />,
      color: "#e83e8c",
      threshold: thresholds["temperature"],
    },
    {
      label: "Turbidity",
      value: latest.turbidity !== undefined ? String(latest.turbidity) : "0",
      unit: "NTU",
      icon: <Waves size={30} color="#28a745" />,
      color: "#28a745",
      threshold: thresholds["turbidity"],
    },
    {
      label: "Salinity",
      value: latest.salinity !== undefined ? String(latest.salinity) : "0",
      unit: "ppt",
      icon: <Droplet size={30} color="#8b5cf6" />,
      color: "#8b5cf6",
      threshold: thresholds["Salinity"],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.parametersContainer}>
        {parameters.map((param, index) => (
          <View
            key={index}
            style={styles.parameterCard}
          >
            <View>
              {param.icon}
              <View style={styles.iconValueContainer}>
                <Text
                  style={[styles.valueText, {
                    color: param.color,
                  }]}
                >
                  {param.value}
                </Text>
                <Text
                  style={[styles.unitText, {
                    color: param.color,
                  }]}
                >
                  {param.unit}
                </Text>
              </View>
            </View>
            <Text style={styles.labelText}>
              {param.label}
            </Text>
            {param.threshold && param.threshold.min !== undefined && param.threshold.max !== undefined && (
              <Text style={styles.thresholdText}>
                Normal range: {param.threshold.min} - {param.threshold.max}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
