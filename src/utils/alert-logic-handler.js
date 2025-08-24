import { getWaterQualityThresholds } from "@constants/thresholds";
import { formatSensorData } from "./format-sensor-data";

const parameterNames = {
  pH: "pH",
  temperature: "Temperature",
  turbidity: "Turbidity",
  salinity: "Salinity",
};

export function getAlertsFromSensorData(sensorData) {
  // Format the data for consistency
  const formattedData = formatSensorData(sensorData);
  if (!Array.isArray(formattedData) || formattedData.length === 0) return [];

  const thresholds = getWaterQualityThresholds();
  if (!thresholds || typeof thresholds !== "object") return [];

  const latest = formattedData.at(-1);
  if (!latest || typeof latest !== "object") return [];

  // First collect all parameters that have alerts
  const alerts = [];
  const alertedParameters = new Set();
  
  Object.entries(thresholds).forEach(([parameter, t]) => {
    if (!t || typeof t !== "object") return;
    const value = Number(latest[parameter]);
    if (isNaN(value)) return;

    const range = t.max - t.min;
    const nearZone = range * 0.05; // 5% of the range

    if (t.min !== undefined && value < t.min) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "error", // RED
        title: `${parameterNames[parameter] || parameter} Low`,
        message: `${parameterNames[parameter] || parameter} is too low!`,
        value,
        threshold: t,
      });
} else if (t.max !== undefined && value > t.max) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "error", // RED
        title: `${parameterNames[parameter] || parameter} High`,
        message: `${parameterNames[parameter] || parameter} is above normal.`,
        value,
        threshold: t,
      });
} else if (
      t.min !== undefined &&
      value < t.min + nearZone
    ) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Near Low`,
        message: `${parameterNames[parameter] || parameter} close on minimum safe value.`,
        value,
        threshold: t,
      });
} else if (
      t.max !== undefined &&
      value > t.max - nearZone
    ) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Near High`,
        message: `${parameterNames[parameter] || parameter} close on maximum safe value.`,
        value,
        threshold: t,
      });
} else if (
      t.min !== undefined &&
      value < t.min + 2
    ) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Dropping`,
        message: `${parameterNames[parameter] || parameter} near minimum safe value.`,
        value,
        threshold: t,
      });
} else if (
      t.max !== undefined &&
      value > t.max - 2
    ) {
      alertedParameters.add(parameter);
      alerts.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Approaching High`,
        message: `${parameterNames[parameter] || parameter} close on maximum safe value.`,
        value,
        threshold: t,
      });
    } else {
      // For parameters that don't match any alert conditions, add a normal status
      alerts.push({
        parameter,
        type: "normal",
        title: `${parameterNames[parameter] || parameter} Normal`,
        message: `${parameterNames[parameter] || parameter} is within normal range.`,
        value,
        threshold: t,
      });
    }
  });

  // Add normal status for parameters that didn't generate any alerts
  Object.keys(thresholds).forEach(parameter => {
    if (!alertedParameters.has(parameter)) {
      alerts.push({
        parameter,
        type: "normal",
        title: `${parameterNames[parameter] || parameter} Normal`,
        message: `${parameterNames[parameter] || parameter} is within normal range.`,
        value: latest[parameter],
        threshold: thresholds[parameter],
      });
    }
  });

  if (latest.isRaining === true) {
    alerts.push({
      parameter: "rain",
      type: "info",
      title: "Rain Detected",
      message: "It is currently raining. Please take necessary precautions.",
      value: true,
      threshold: null,
    });
  }

  return alerts;
}
