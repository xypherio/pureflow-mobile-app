/**
 * Report-related constants for water quality monitoring
 */

export const PARAMETER_CONFIG = {
  pH: { unit: "", safeRange: "6.5 - 8.5", displayName: "pH" },
  temperature: {
    unit: "°C",
    safeRange: "26 - 30°C",
    displayName: "Temperature",
  },
  salinity: { unit: "ppt", safeRange: "0 - 5 ppt", displayName: "Salinity" },
  turbidity: { unit: "NTU", safeRange: "0 - 50 NTU", displayName: "Turbidity" },
  tds: { unit: "mg/L", safeRange: "0 - 1000 mg/L", displayName: "TDS" },
};

export const timePeriodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export const getStatusColor = (status) => {
  switch (status) {
    case "critical":
      return "#ef4444";
    case "warning":
      return "#eab308";
    case "normal":
    default:
      return "#22c55e";
  }
};
