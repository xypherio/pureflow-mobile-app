import { getWaterQualityThresholds } from "@constants/thresholds";
import { globalStyles } from "@styles/globalStyles.js";
import * as Lucide from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const parameterIconMap = {
  ph: Lucide.Droplet,
  temperature: Lucide.Thermometer,
  tds: Lucide.Waves,
  salinity: Lucide.Water,
  // Add more as needed
};

const typeStyles = {
  success: {
    bg: "#e6f9ec",
    icon: Lucide.CheckCircle2,
    iconColor: "#22c55e",
    title: "#15803d",
    message: "#15803d",
  },
  warning: {
    bg: "#fff7e6",
    icon: Lucide.AlertCircle,
    iconColor: "#f59e42",
    title: "#b45309",
    message: "#b45309",
  },
  error: {
    bg: "#ffeaea",
    icon: Lucide.XCircle,
    iconColor: "#ef4444",
    title: "#b91c1c",
    message: "#b91c1c",
  },
  info: {
    bg: "#f6fafd",
    icon: Lucide.CloudRain,
    iconColor: "#2563eb",
    title: "#1c5c88",
    message: "#1c5c88",
  },
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 80,
    height: 80,
    ...globalStyles.boxShadow,
    position: "relative",
  },
  indicatorBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 6,
    borderRadius: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  thresholdText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: "#e5e7eb",
  },
  dotActive: {
    backgroundColor: "#3b82f6",
  },
});

export default function AlertsCard({ alerts = [], realtimeData = null, interval = 4000 }) {
  const [current, setCurrent] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const previousAlertTypeRef = useRef('success');

  // Debug logging for incoming alerts
  useEffect(() => {
    console.log('🔔 AlertsCard received alerts:', {
      alertsCount: alerts?.length,
      alerts: alerts,
      hasAlertsWithParameter: Array.isArray(alerts) && alerts.some(a => a?.parameter),
      hasRealtimeData: !!realtimeData
    });
  }, [alerts, realtimeData]);

  const keyParameters = ["pH", "Temperature", "TDS", "Salinity"];
  const thresholds = useMemo(() => getWaterQualityThresholds(), []);

  // Helper function to map severity to type
  const mapSeverityToType = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  // Helper function to evaluate parameter value against thresholds
  const evaluateParameter = useCallback((parameter, value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    const paramKey = parameter.toLowerCase();
    const threshold = thresholds[parameter] || thresholds[paramKey];
    
    if (!threshold) {
      return null;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return null;
    }

    // Check critical thresholds (if they exist)
    if (threshold.critical) {
      if (threshold.critical.min && numValue < threshold.critical.min) {
        return { type: 'error', level: 'critical' };
      }
      if (threshold.critical.max && numValue > threshold.critical.max) {
        return { type: 'error', level: 'critical' };
      }
    }

    // Check normal thresholds
    if (threshold.min && numValue < threshold.min) {
      return { type: 'warning', level: 'warning' };
    }
    if (threshold.max && numValue > threshold.max) {
      return { type: 'warning', level: 'warning' };
    }

    return { type: 'success', level: 'normal' };
  }, [thresholds]);

  // Generate alerts from realtimeData if alerts prop is empty
  const generateAlertsFromRealtimeData = useCallback((realtimeData) => {
    if (!realtimeData) return [];

    const generatedAlerts = [];
    let actualSensorData = realtimeData;
    if (realtimeData.reading) {
      actualSensorData = realtimeData.reading;
    }

    // Check each parameter
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    parameters.forEach(param => {
      const value = actualSensorData[param] || actualSensorData[param.toLowerCase()];
      if (value !== null && value !== undefined && !isNaN(value)) {
        const evaluation = evaluateParameter(param, value);
        if (evaluation && evaluation.type !== 'success') {
          const threshold = thresholds[param] || thresholds[param.toLowerCase()];
          const paramDisplay = param.charAt(0).toUpperCase() + param.slice(1);
          
          let message = '';
          const unit = param === 'pH' ? '' : param === 'temperature' ? '°C' : param === 'salinity' ? 'ppt' : 'ppm';
          const displayValue = `${Number(value).toFixed(2)}${unit}`;

          if (evaluation.type === 'error') {
            // Critical alerts - brief but informative
            switch (param.toLowerCase()) {
              case 'ph':
                message = value < (threshold?.min || 0)
                  ? `pH critically low (${displayValue}). Add baking soda to balance.`
                  : `pH critically high (${displayValue}). Add vinegar to balance.`;
                break;
              case 'temperature':
                message = value < (threshold?.min || 0)
                  ? `Temperature critically low (${displayValue}). May stress aquatic life.`
                  : `Temperature critically high (${displayValue}). May promote bacterial growth.`;
                break;
              case 'tds':
                message = value < (threshold?.min || 0)
                  ? `TDS critically low (${displayValue}). Check for dilution issues.`
                  : `TDS critically high (${displayValue}). Consider reverse osmosis.`;
                break;
              case 'salinity':
                message = value < (threshold?.min || 0)
                  ? `Salinity critically low (${displayValue}). May affect marine life.`
                  : `Salinity critically high (${displayValue}). May harm freshwater organisms.`;
                break;
              default:
                message = `${paramDisplay} critically ${value < (threshold?.min || 0) ? 'low' : 'high'} (${displayValue})`;
            }
          } else {
            // Warning alerts - brief guidance
            switch (param.toLowerCase()) {
              case 'ph':
                message = value < (threshold?.min || 0)
                  ? `pH below optimal (${displayValue}). Monitor for corrosion.`
                  : `pH above optimal (${displayValue}). Monitor for scaling.`;
                break;
              case 'temperature':
                message = value < (threshold?.min || 0)
                  ? `Temperature low (${displayValue}). May reduce treatment effectiveness.`
                  : `Temperature elevated (${displayValue}). May accelerate reactions.`;
                break;
              case 'tds':
                message = value < (threshold?.min || 0)
                  ? `TDS below normal (${displayValue}). May indicate dilution.`
                  : `TDS elevated (${displayValue}). May affect taste and appliances.`;
                break;
              case 'salinity':
                message = value < (threshold?.min || 0)
                  ? `Salinity below normal (${displayValue}). Check for freshwater intrusion.`
                  : `Salinity elevated (${displayValue}). Monitor ecosystem impact.`;
                break;
              default:
                message = `${paramDisplay} ${value < (threshold?.min || 0) ? 'low' : 'high'} (${displayValue})`;
            }
          }

          generatedAlerts.push({
            parameter: paramDisplay,
            type: evaluation.type,
            severity: evaluation.level === 'critical' ? 'high' : 'medium',
            title: `${paramDisplay} Alert`,
            message: message,
            value: value
          });
        }
      }
    });

    return generatedAlerts;
  }, [evaluateParameter, thresholds]);

  // Process and normalize alerts
  const processAlerts = useCallback((alerts) => {
    if (!Array.isArray(alerts)) {
      console.warn('⚠️ Alerts is not an array, defaulting to empty array');
      return [];
    }

    return alerts
      .filter(alert => {
        // Filter out invalid alerts
        const isValid = alert && 
          (alert.parameter || alert.title) && 
          (alert.message || alert.description || alert.displayMessage);
        
        if (!isValid) {
          console.warn('⚠️ Invalid alert format:', alert);
        }
        return isValid;
      })
      .map(alert => {
        // Map severity to type if type is not present
        const alertType = alert.type || mapSeverityToType(alert.severity);
        
        return {
          // Normalize alert structure
          ...alert,
          title: alert.title || `${alert.parameter || 'Unknown'} Alert`,
          message: alert.message || alert.description || alert.displayMessage || 'No message provided',
          type: alertType,
          parameter: alert.parameter || ''
        };
      });
  }, []);

  const displayAlerts = useMemo(() => {
    // First, try to use alerts from props
    let processedAlerts = processAlerts(alerts);
    
    // If no alerts from props but we have realtimeData, generate alerts from it
    if (processedAlerts.length === 0 && realtimeData) {
      const generatedAlerts = generateAlertsFromRealtimeData(realtimeData);
      processedAlerts = processAlerts(generatedAlerts);
    }
    
    if (processedAlerts.length > 0) {
      return processedAlerts;
    }

    // Default alert when no active alerts
    return [{
      parameter: "",
      type: "success",
      title: "All Parameters Normal",
      message: `All parameters (${keyParameters.join(", ")}) are within the normal range.`,
      isDefault: true
    }];
  }, [alerts, realtimeData, processAlerts, generateAlertsFromRealtimeData]);

  // Debug processed alerts - only log count
  useEffect(() => {
    if (displayAlerts.length > 0) {
      console.log(`📋 Displaying ${displayAlerts.length} alerts`);
    }
  }, [displayAlerts.length]);

  // Sound effects disabled due to expo-av compatibility issues
  // TODO: Re-enable when expo-av is properly configured in the project
  // For now, alerts work visually without audio

  // Animation and index logic
  useEffect(() => {
    if (displayAlerts.length <= 1) return;
    let isMounted = true;
    const animateToNext = () => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(() => {
        if (!isMounted) return;
        setCurrent((prev) => (prev + 1) % displayAlerts.length);
        scaleAnim.setValue(1.05);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]).start();
      });
    };
    const timer = setInterval(animateToNext, interval);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [displayAlerts.length, interval, scaleAnim, opacityAnim]);

  // Reset current index if alerts change
  useEffect(() => {
    setCurrent(0);
  }, [alerts]);

  if (!displayAlerts.length) {
    return null;
  }

  const alert = displayAlerts[current];

  if (!alert) return null;

  const style = typeStyles[alert.type] || typeStyles.error;
  // Use parameter icon if available, fallback to type icon, then HelpCircle
  const ParameterIcon =
    alert.parameter && parameterIconMap[alert.parameter.toLowerCase()]
      ? parameterIconMap[alert.parameter.toLowerCase()]
      : style.icon || Lucide.HelpCircle;

  // Helper to capitalize each word in a string
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Helper to capitalize only the first letter
  function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const getIndicatorColor = () => {
    switch (alert.type) {
      case "success":
        return "#22c55e";
      case "warning":
        return "#f59e42";
      case "error":
        return "#ef4444";
      default:
        return "#2563eb";
    }
  };

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: style.bg,
          },
        ]}
      >
        {/* Color indicator bar */}
        <View
          style={[styles.indicatorBar, { backgroundColor: getIndicatorColor() }]}
        />
        {/* Parameter icon */}
        <View style={styles.iconContainer}>
          <ParameterIcon size={22} color={style.iconColor} />
        </View>
        {/* Texts */}
        <View style={styles.textContainer}>
          <Text
            style={[styles.titleText, { color: style.title }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {capitalizeWords(alert.title)}
          </Text>
          <Text
            style={[styles.messageText, { color: style.message }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {capitalizeFirst(alert.message)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
