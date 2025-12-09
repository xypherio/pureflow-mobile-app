/** WaterQualitySummaryCard - Overall water quality summary with WQI score, quality level indicators, and parameter pills */
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

// Quality levels configuration for different water quality states
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

// Parameter icons mapping for different sensor types
const PARAMETER_ICONS = {
  pH: Gauge,
  temperature: Thermometer,
  salinity: Waves,
  turbidity: Droplet,
};

/**
 * Get status color based on parameter status level
 * @param {string} status - The status level (critical, warning, normal)
 * @returns {string} Hex color code for the status
 */
const getStatusColor = (status) =>
  ({
    critical: "#DC2626",
    warning: "#D97706",
    normal: "#10B981",
  }[status] || "#10B981");

/**
 * ParameterPill component for displaying individual parameter values
 * @param {Object} props
 * @param {string} props.name - Parameter name (pH, temperature, etc.)
 * @param {number} props.value - Parameter value
 * @param {string} props.status - Parameter status
 * @param {string} props.unit - Parameter unit
 */
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
          {value !== undefined && value !== null ? Number(value).toFixed(2) : "N/A"}
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
  wqi = { value: 0, status: "unknown" },
}) {
  const level = QUALITY_LEVELS[qualityLevel] || QUALITY_LEVELS.normal;
  const IconComponent = level.icon;

  // If no parameters, show the monitoring starting state
  if (parameters.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.statusIcon, { backgroundColor: '#dbeafe' }]}>
            <CheckCircle size={28} color="#3b82f6" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Water Quality Monitoring</Text>
            <Text style={styles.subtitle}>Not started yet</Text>
          </View>
        </View>

        <View style={[styles.statusBanner, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.statusLabel, { color: '#3b82f6' }]}>
            Monitoring Starting
          </Text>
          <Text style={styles.statusDescription}>
            Parameters will appear once sensors begin collecting data
          </Text>
        </View>
      </View>
    );
  }

  // Show normal card with parameters
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
        <Text style={[styles.wqiScore, { color: level.color }]}>
          WQI: {wqi.value}/100 ({wqi.status})
        </Text>
        <Text style={styles.statusDescription}>{level.description}</Text>
      </View>

      <View style={styles.parametersGrid}>
        {parameters.map((param) => (
          <ParameterPill key={param.name} {...param} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 18,
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
  wqiScore: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
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
