/** ParameterGridCard - Compact grid layout of parameter cards showing status and values */
import { globalStyles } from "@styles/globalStyles.js";
import { Eye, Gauge, Thermometer, Waves } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PARAMETER_CONFIG = {
  pH: {
    icon: Gauge,
    bgColor: "#E0F2FE",
    iconColor: "#0284C7",
    unit: "pH",
    normalRange: "6.5-8.5",
  },
  temperature: {
    icon: Thermometer,
    bgColor: "#FEF3C7",
    iconColor: "#D97706",
    unit: "°C",
    normalRange: "15-35",
  },
  salinity: {
    icon: Waves,
    bgColor: "#E0E7FF",
    iconColor: "#7C3AED",
    unit: "ppt",
    normalRange: "0-35",
  },
  turbidity: {
    icon: Eye,
    bgColor: "#F3E8FF",
    iconColor: "#9333EA",
    unit: "NTU",
    normalRange: "0-5",
  },
};

const stylesheet = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
    flexBasis: "48%",
    flexShrink: 0,
    justifyContent: "space-between",
    ...globalStyles.boxShadow,
    marginBottom: 16,
  },
  iconContainer: {
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    width: 48,
    height: 48,
  },
  parameterName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  valueText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  normalRangeText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  noDataContainer: { 
    padding: 20, 
    alignItems: 'center' 
  },
  noDataText: { 
    color: '#6B7280' 
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  }
});

const ParameterCard = ({ parameter, value, status, onPress }) => {
  console.log(`ParameterCard rendering: ${parameter}, value: ${value}, status: ${status}`);
  
  // Normalize parameter name for case-insensitive lookup
  const normalizedParam = parameter.toLowerCase();
  const config = PARAMETER_CONFIG[normalizedParam] || PARAMETER_CONFIG.pH;
  const IconComponent = config.icon;

  console.log(`Using config for parameter: ${normalizedParam}`, config);
  console.log(`Available config keys:`, Object.keys(PARAMETER_CONFIG));
  console.log(`Looking for: ${normalizedParam}`);

  const getStatusColor = (status) => {
    console.log(`Getting status color for: ${status}`);
    switch (status) {
      case "normal":
        return "#10B981";
      case "moderate":
        return "#F59E0B";
      case "bad":
        return "#EF4444";
      default:
        console.warn(`Unknown status: ${status}, using default color`);
        return "#10B981";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={stylesheet.card}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={[stylesheet.iconContainer, {
            backgroundColor: config.bgColor,
          }]}
        >
          <IconComponent size={24} color={config.iconColor} />
        </View>

        <Text
          style={stylesheet.parameterName}
        >
          {parameter}
        </Text>

        <Text
          style={stylesheet.valueText}
        >
          {value}
          {config.unit}
        </Text>

        <View
          style={[stylesheet.statusContainer, {
            backgroundColor: getStatusColor(status) + "20",
          }]}
        >
          <Text
            style={[stylesheet.statusText, {
              color: getStatusColor(status),
            }]}
          >
            {status}
          </Text>
        </View>

        <Text
          style={stylesheet.normalRangeText}
        >
          Normal: {config.normalRange}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ParameterGridCard({ parameters, onParameterPress }) {
  console.log('ParameterGridCard received parameters:', parameters);
  console.log('ParameterGridCard parameter keys:', Object.keys(parameters || {}));
  
  if (!parameters || Object.keys(parameters).length === 0) {
    console.log('No parameters available, showing empty state');
    return (
      <View style={stylesheet.noDataContainer}>
        <Text style={stylesheet.noDataText}>No parameter data available.</Text>
      </View>
    );
  }

  return (
    <View style={stylesheet.gridContainer}>
      {Object.entries(parameters).map(([name, data]) => {
        // Normalize parameter name to handle case sensitivity
        const normalizedName = name.toLowerCase();
        console.log(`Rendering parameter: ${name} (normalized: ${normalizedName})`);
        console.log(`Parameter data:`, data);
        
        return (
          <ParameterCard
            key={name}
            parameter={name}
            value={data.value}
            status={data.status}
            onPress={() => onParameterPress && onParameterPress(name)}
          />
        );
      })}
    </View>
  );
}
