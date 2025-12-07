import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Cloud,
  Droplet,
  Gauge,
  Info,
  Thermometer,
  Waves,
  XCircle
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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

const getParameterIcon = (paramName, iconSize = 130) => {
  const iconStyles = {
    position: 'absolute',
    bottom: 0,
    right: -10,
  };

  if (!paramName) return null;

  switch (paramName.toString().toLowerCase()) {
    case 'ph':
    case 'ph value':
      return <Gauge size={iconSize} color="rgba(59, 130, 246, 0.08)" style={iconStyles} />;
    case 'temperature':
      return <Thermometer size={iconSize} color="rgba(216, 42, 113, 0.08)" style={iconStyles} />;
    case 'turbidity':
      return <Droplet size={iconSize} color="rgba(16, 185, 129, 0.08)" style={iconStyles} />;
    case 'salinity':
      return <Waves size={iconSize} color="rgba(139, 92, 246, 0.08)" style={iconStyles} />;
    case 'weather':
    case 'israining':
      return <Cloud size={iconSize} color="rgba(59, 130, 246, 0.08)" style={iconStyles} />;
    default:
      return null;
  }
};

export default NotificationCard = ({
  type = "info",
  title,
  message,
  timestamp,
  impact = null,
  recommendations = [],
  parameter = null,
  bg,
  iconColor,
  icon
}) => {
  const getIconComponent = (iconName) => {
    switch (iconName) {
      case "x-circle": return XCircle;
      case "alert-triangle": return AlertTriangle;
      case "check-circle": return CheckCircle;
      case "info": return Info;
      case "cloud": return Cloud;
      default: return AlertCircle;
    }
  };

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
      case 'weather':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const renderParameterIcon = () => {
    let IconComponent = AlertCircle;
    let iconColorValue = '#FFFFFF';
    let backgroundColor = getParameterColor();

    if (bg && iconColor && icon) {
      // Use new props for notifications
      IconComponent = getIconComponent(icon);
      iconColorValue = iconColor;
      backgroundColor = bg;
    } else {
      // Fallback to old parameter-based logic
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
    }

    return (
      <View style={[styles.parameterIconContainer, { backgroundColor }]}>
        <IconComponent size={23} color={iconColorValue} strokeWidth={2} />
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

  const getImpactColor = (impact) => {
    switch (impact.toLowerCase()) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'normal': return '#10B981';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const backgroundIcon = getParameterIcon(parameter, 100); // Smaller than ParameterCard for notification cards

  return (
    <View style={[styles.container]}>
      {backgroundIcon && (
        <View style={styles.backgroundIconContainer}>
          {backgroundIcon}
        </View>
      )}
      {renderParameterIcon()}
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          {renderTimestamp()}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
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
    overflow: 'hidden',
  },
  backgroundIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  parameterIconContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
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
