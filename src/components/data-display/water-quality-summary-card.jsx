import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Droplet,
  Gauge,
  Thermometer,
  Waves,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { globalStyles } from "../../styles/globalStyles";

const QUALITY_LEVELS = {
  normal: {
    color: "#10B981",
    bg: "#D1FAE5",
    icon: CheckCircle,
    label: "Good",
    description: "All parameters are within normal ranges",
  },
  warning: {
    color: "#D97706",
    bg: "#FEF3C7",
    icon: AlertCircle,
    label: "Needs Attention",
    description: "Some parameters require monitoring",
  },
  critical: {
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: AlertTriangle,
    label: "Critical",
    description: "Immediate action required",
  },
};

const PARAMETER_ICONS = {
  pH: Gauge,
  temperature: Thermometer,
  salinity: Waves,
  turbidity: Droplet,
};

const getStatusColor = (status) =>
  ({
    critical: "#DC2626",
    warning: "#D97706",
    normal: "#10B981",
  }[status] || "#10B981");

const ParameterPill = ({ name, value, status, unit }) => {
  const Icon = PARAMETER_ICONS[name] || Droplet;
  const color = getStatusColor(status);

  return (
    <View style={[styles.parameterPill, { borderColor: `${color}20` }]}>
      <View style={[styles.parameterIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={16} color={color} />
      </View>
      <View>
        <Text style={styles.parameterName}>{name}</Text>
        <Text style={[styles.parameterValue, { color }]}>
          {value?.toFixed(2)}
          {unit}
        </Text>
      </View>
    </View>
  );
};

export default function WaterQualitySummaryCard({
  qualityLevel = "normal",
  lastUpdated = "Just now",
  parameters = [],
}) {
  const level = QUALITY_LEVELS[qualityLevel] || QUALITY_LEVELS.normal;
  const IconComponent = level.icon;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusIcon, { backgroundColor: level.bg }]}>
          <IconComponent size={28} color={level.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Water Quality Status</Text>
          <Text style={styles.subtitle}>Last updated: {lastUpdated}</Text>
        </View>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: level.bg }]}>
        <Text style={[styles.statusLabel, { color: level.color }]}>
          {level.label}
        </Text>
        <Text style={styles.statusDescription}>{level.description}</Text>
      </View>

      {parameters.length > 0 && (
        <View style={styles.parametersGrid}>
          {parameters.map((param) => (
            <ParameterPill key={param.name} {...param} />
          ))}
        </View>
      )}
    </View>
  );
}

// ... (previous imports and component code remains the same) ...

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    ...globalStyles.boxShadow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  statusDescription: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  parametersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: -8,
  },
  parameterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 8,
    margin: 4,
    minWidth: "45%",
    flex: 1,
    borderWidth: 1,
  },
  parameterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  parameterName: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
});
