// src/services/suggestionEngine.js

/**
 * A rule-based engine to generate water quality suggestions directly in the app.
 * This approach is fast, free, and works offline.
 * @param {object} data - The latest sensor data.
 * @returns {object} A suggestion object.
 */
export function generateSuggestions(data) {
  // Rule 1: Critical pH
  if (data.pH < 6.5 || data.pH > 8.5) {
    return {
      type: "critical",
      title: "Critical pH Level",
      description: `The pH level is ${data.pH}, which is outside the safe range (6.5-8.5).`,
      suggestion: "Immediate action required. Check for potential contamination sources or equipment malfunction.",
    };
  }

  // Rule 2: High Turbidity
  if (data.turbidity > 5) {
    return {
      type: "warning",
      title: "High Turbidity Detected",
      description: `Turbidity is at ${data.turbidity} NTU, indicating cloudy water.`,
      suggestion: "Inspect the water source for sediment or runoff, especially if it has been raining.",
    };
  }
  
  // Rule 3: Temperature Warning
  if (data.temperature > 30) {
    return {
      type: "warning",
      title: "High Water Temperature",
      description: `The water temperature is high (${data.temperature}°C), which can affect oxygen levels.`,
      suggestion: "Monitor aquatic life for signs of distress. Ensure proper aeration.",
    };
  }

  // Rule 4: Informational - Rain
  if (data.isRaining) {
    return {
        type: "info",
        title: "Rain Detected",
        description: "Rain can temporarily affect water parameters like turbidity and pH.",
        suggestion: "Keep a close eye on real-time data over the next few hours for any significant changes.",
    };
  }

  // Default Rule: All Good
  return {
    type: "positive",
    title: "Excellent Water Quality",
    description: "All parameters are within the optimal range. The water is healthy and stable.",
    suggestion: "Continue current monitoring practices. No immediate action is required.",
  };
}
