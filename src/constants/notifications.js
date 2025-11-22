/**
 * Notification-related constants and utilities
 */

import { AlertTriangle, Bell, CheckCircle, Info } from "lucide-react-native";

// Alert type mappings for display
export const getAlertIcon = (type) => {
  switch (type) {
    case "error":
      return <AlertTriangle size={20} color="#ef4444" />;
    case "warning":
      return <AlertTriangle size={20} color="#eab308" />;
    case "info":
      return <Info size={20} color="#2563eb" />;
    case "success":
      return <CheckCircle size={20} color="#22c55e" />;
    default:
      return <Bell size={20} color="#6b7280" />;
  }
};

export const getSeverityColor = (severity) => {
  switch (severity) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#eab308";
    case "low":
      return "#22c55e";
    default:
      return "#6b7280";
  }
};

export const alertLevelMap = {
  success: { icon: "check-circle", iconColor: "#22c55e", bg: "#e6f9ed" },
  warning: { icon: "alert-triangle", iconColor: "#eab308", bg: "#fef9c3" },
  error: { icon: "x-circle", iconColor: "#ef4444", bg: "#fee2e2" },
  info: { icon: "info", iconColor: "#2563eb", bg: "#dbeafe" },
};
