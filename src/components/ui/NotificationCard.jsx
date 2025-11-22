import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Droplet,
  Gauge,
  Shield,
  Thermometer,
  Waves
} from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../constants/colors";

const getAlertColors = (type) => {
  switch (type?.toLowerCase()) {
    case "error":
    case "critical":
      return {
        iconBg: ["#FF416C", "#FF4B2B"],
        iconColor: "#FFFFFF",
        textColor: "#DC2626",
        bg: "#FEF2F2",
      };
    case "warning":
      return {
        iconBg: ["#FFB74D", "#FF9800"],
        iconColor: "#FFFFFF",
        textColor: "#B45309",
        bg: "#FFFBEB",
      };
    case "success":
      return {
        iconBg: ["#4CAF50", "#66BB6A"],
        iconColor: "#FFFFFF",
        textColor: "#065F46",
        bg: "#ECFDF5",
      };
    default: // info
      return {
        iconBg: ["#3B82F6", "#60A5FA"],
        iconColor: "#FFFFFF",
        textColor: "#1E40AF",
        bg: "#EFF6FF",
      };
  }
};

export default NotificationCard = ({
  type = "info",
  title,
  message,
  timestamp,
  expandable = false,
  impact = null,
  recommendations = [],
  parameter = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderParameterIcon = () => {
    let IconComponent = AlertCircle;
    let iconColor = '#FFFFFF'; // White icon color for contrast

    // Parameter-based icons using specific colors from theme
    switch (parameter?.toLowerCase()) {
      case 'ph':
      case 'pH':
        IconComponent = Gauge;
        break;
      case 'temperature':
      case 'temp':
        IconComponent = Thermometer;
        break;
      case 'turbidity':
        IconComponent = Droplet;
        break;
      case 'salinity':
        IconComponent = Waves;
        break;
      default:
        IconComponent = AlertCircle;
    }

    // Get parameter color from theme
    const getParameterColor = () => {
      switch (parameter?.toLowerCase()) {
        case 'ph':
        case 'pH':
          return colors.phColor;
        case 'temperature':
        case 'temp':
          return colors.tempColor;
        case 'turbidity':
          return colors.turbidityColor;
        case 'salinity':
          return colors.salinityColor;
        default:
          return '#6B7280';
      }
    };

    return (
      <View style={[styles.parameterIconContainer, { backgroundColor: getParameterColor() }]}>
        <IconComponent size={23} color={iconColor} strokeWidth={2} />
      </View>
    );
  };

  const renderTimestamp = () => {
    if (!timestamp) return null;

    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(timestamp)) / (1000 * 60));

    let timeAgo;
    if (diffInMinutes < 1) timeAgo = "Just now";
    else if (diffInMinutes < 60) timeAgo = `${diffInMinutes}m ago`;
    else if (diffInMinutes < 1440)
      timeAgo = `${Math.floor(diffInMinutes / 60)}h ago`;
    else timeAgo = new Date(timestamp).toLocaleDateString();

    return <Text style={styles.timestamp}>{timeAgo}</Text>;
  };

  const renderExpandedContent = () => {
    if (!isExpanded) return null;

    return (
      <View style={styles.expandedContainer}>
        {/* Impact */}
        {impact && (
          <View style={styles.expandedItem}>
            <Shield size={16} color="#EF4444" style={styles.expandedIcon} />
            <Text style={styles.expandedLabel}>Impact:</Text>
            <View style={[styles.impactBadge, { backgroundColor: getImpactColor(impact) }]}>
              <Text style={styles.impactText}>{impact.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <View style={styles.expandedItem}>
              <CheckCircle size={16} color="#3B82F6" style={styles.expandedIcon} />
              <Text style={styles.expandedLabel}>Recommendations:</Text>
            </View>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const getImpactColor = (impact) => {
    switch (impact.toLowerCase()) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'normal': return '#10B981';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
      style={[styles.container]}
    >
      {/* Dropdown button positioned at top right */}
      {expandable && (
        <View style={styles.dropdownButtonContainer}>
          {isExpanded ? (
            <ChevronUp size={16} color="#6B7280" />
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </View>
      )}

      {renderParameterIcon()}
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          {renderTimestamp()}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
        {expandable && renderExpandedContent()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    position: "relative",
  },
  parameterIconContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 38,
    height: 36,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 32,
    paddingLeft: 50
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    color: "#224986",
    paddingBottom: 5,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  message: {
    fontSize: 15,
    color: "#6B7280",
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  timestamp: {
    fontSize: 3,
    color: "#6B7280"
  },
  dropdownButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  expandedContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  expandedItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  expandedIcon: {
    marginRight: 6,
  },
  expandedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginRight: 6,
    minWidth: 80,
  },
  expandedValue: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 50,
    alignItems: "center",
  },
  impactText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  recommendationsContainer: {
    marginTop: 4,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    marginLeft: 22,
  },
  bulletPoint: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 6,
    marginTop: -2,
  },
  recommendationText: {
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
    lineHeight: 18,
    numberOfLines: 3,
    ellipsizeMode: 'tail',
  },
});
