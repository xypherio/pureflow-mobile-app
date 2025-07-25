import { getWaterQualityThresholds } from "../constants/thresholds";

// Map parameter to readable name (for title)
const parameterNames = {
  ph: "pH",
  temperature: "temperature",
  tds: "turbidty",
  salinity: "salinity",
};

export function getAlertsFromSensorData(sensorData) {
  if (!sensorData || !Array.isArray(sensorData)) return [];
  if (!getWaterQualityThresholds) return [];

  const latest = sensorData[sensorData.length - 1];
  if (!latest) return [];

  const alerts = [];

  // Check water quality parameters
  Object.keys(getWaterQualityThresholds).forEach((parameter) => {
    const value = latest[parameter];
    const t = getWaterQualityThresholds[parameter];
    if (value == null || !t) return;

    let type = "success";
    let title = `${parameterNames[parameter] || parameter} Normal`;
    let message = `${
      parameterNames[parameter] || parameter
    } is within the safe range.`;

    if (t.min !== undefined && value < t.min) {
      type = "error";
      title = `${parameterNames[parameter]} Low`;
      message = `${parameterNames[parameter]} is too low!`;
    } else if (t.max !== undefined && value > t.max) {
      type = "warning";
      title = `${parameterNames[parameter]} High`;
      message = `${parameterNames[parameter]} is above normal.`;
    }

    if (type !== "success") {
      alerts.push({ parameter, type, title, message, value, threshold: t });
    }
  });

  // Check isRaining field
  if (latest.isRaining === true) {
    alerts.push({
      parameter: "rain",
      type: "info",
      title: "Rain Detected",
      message: "It is currently raining. Please take necessary precautions.",
      value: true,
      threshold: null
    });
  }

  return alerts;
}
