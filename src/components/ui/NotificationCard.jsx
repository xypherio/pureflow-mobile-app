import { useNavigation } from "@react-navigation/native";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CloudRain,
  Info,
  XCircle
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  icon = null,
  dotColor = "#3B82F6",
  bg,
  iconColor
}) => {
  const colors = getAlertColors(type);
  const navigation = useNavigation();

 const renderIcon = () => {
    let IconComponent = AlertCircle;
    let alertIconColor = iconColor || colors.iconColor; // Use prop if available, otherwise default
    let alertBgColor = bg || colors.iconBg[0];

    if (type?.toLowerCase() === "rain") {
      IconComponent = CloudRain;
    } else if (icon && alertIcons[icon]) {
      IconComponent = alertIcons[icon];
    }

    return (
      <View style={[styles.iconContainer, { backgroundColor: alertBgColor }]}>
        <IconComponent size={24} color={alertIconColor} strokeWidth={2} />
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

  return (
    <View style={styles.container}>
      {renderIcon()}
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          {renderTimestamp()}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={[styles.dotIndicator, { backgroundColor: dotColor }]} />
    </View>
  );
};

const alertIcons = {
  "check-circle": CheckCircle,
  "alert-triangle": AlertTriangle,
  "x-circle": XCircle,
  info: Info,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    position: "relative",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    color: "#224986",
    paddingBottom: 0,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
  },
  timestamp: {
    fontSize: 6,
    color: "#6B7280"
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    position: "absolute",
    top: 12,
    right: 12,
  },
});
