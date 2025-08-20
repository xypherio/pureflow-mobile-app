import { getWaterQualityThresholds } from "@constants/thresholds";

function formatTimeByOffset(hoursFromNow) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesStr} ${ampm}`;
}

function parseTimeframeToHours(timeframe) {
  if (typeof timeframe === "string" && timeframe.endsWith("h")) {
    const n = Number(timeframe.replace("h", ""));
    return Number.isFinite(n) ? n : 6;
  }
  return 6;
}

export function evaluateBreach(parameterKey, predictedValue) {
  const thresholds = getWaterQualityThresholds();
  const key = parameterKey.toLowerCase();
  const t = thresholds[key];
  if (!t) return { breach: false, min: undefined, max: undefined };
  const breach = (typeof t.min === "number" && predictedValue < t.min) || (typeof t.max === "number" && predictedValue > t.max);
  return { breach, min: t.min, max: t.max };
}

export function buildAlertText(parameterKey, predictedValue, timeframe) {
  const hours = parseTimeframeToHours(timeframe);
  const timeStr = formatTimeByOffset(hours);
  const { min, max } = evaluateBreach(parameterKey, predictedValue);
  if (typeof max === "number" && predictedValue > max) {
    return `Will exceed safe range (${parameterKey} > ${max}) by ${timeStr}.`;
  }
  if (typeof min === "number" && predictedValue < min) {
    return `Will drop below safe range (${parameterKey} < ${min}) by ${timeStr}.`;
  }
  return `Within acceptable range for the next ${hours} hours.`;
}

export function buildForecastDetailsFromPredictions(currentValues, predictedValues, timeframe) {
  const details = {};
  const actions = {
    pH: "Add buffer solution",
    Temperature: "Increase shading",
    Turbidity: "Backwash filters",
    Salinity: "Adjust dilution",
  };
  const factorHints = {
    pH: [
      "Rising temperature → Lower dissolved oxygen",
      "Afternoon photosynthesis peak → pH spike",
      "Low alkalinity reduces buffering capacity",
    ],
    Temperature: [
      "Cloud cover reduces surface heating",
      "Cooler inflow mixing expected",
    ],
    Turbidity: [
      "Upstream activity → Sediment load",
      "Filter efficiency trending lower",
    ],
    Salinity: [
      "Evaporation midday → Slight increase",
      "Evening inflow → Dilution",
    ],
  };

  Object.keys(predictedValues).forEach((key) => {
    const label = key;
    const predicted = predictedValues[key];
    const { breach } = evaluateBreach(label, predicted);
    details[label] = {
      breachPredicted: breach,
      alertText: buildAlertText(label, predicted, timeframe),
      factors: factorHints[label] || [],
      actionLabel: actions[label] || "Review system",
    };
  });

  return details;
} 