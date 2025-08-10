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

  const alerts = Object.entries(thresholds).reduce((acc, [parameter, t]) => {
    if (!t || typeof t !== "object") return acc;
    const value = Number(latest[parameter]);
    if (isNaN(value)) return acc;

    const range = t.max - t.min;
    const nearZone = range * 0.05; // 5% of the range

    if (t.min !== undefined && value < t.min) {
      acc.push({
        parameter,
        type: "error", // RED
        title: `${parameterNames[parameter] || parameter} Low`,
        message: `${parameterNames[parameter] || parameter} is too low!`,
        value,
        threshold: t,
      });
    } else if (t.max !== undefined && value > t.max) {
      acc.push({
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
      acc.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Near Low`,
        message: `${parameterNames[parameter] || parameter} is close to the minimum safe value.`,
        value,
        threshold: t,
      });
    } else if (
      t.max !== undefined &&
      value > t.max - nearZone
    ) {
      acc.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Near High`,
        message: `${parameterNames[parameter] || parameter} is close to the maximum safe value.`,
        value,
        threshold: t,
      });
    } else if (
      t.min !== undefined &&
      value < t.min + 2
    ) {
      acc.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Approaching Low`,
        message: `${parameterNames[parameter] || parameter} is close to the minimum safe value.`,
        value,
        threshold: t,
      });
    } else if (
      t.max !== undefined &&
      value > t.max - 2
    ) {
      acc.push({
        parameter,
        type: "warning", // YELLOW
        title: `${parameterNames[parameter] || parameter} Approaching High`,
        message: `${parameterNames[parameter] || parameter} is close to the maximum safe value.`,
        value,
        threshold: t,
      });
    }
    return acc;
  }, []);

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
