import { getWaterQualityThresholds } from "../constants/thresholds";

// Time intervals in milliseconds
const TIME_INTERVALS = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

// Helper function to format date as YYYY-MM-DD for consistent grouping
const createDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

// Function to calculate daily averages from readings
const calculateDailyAverages = (readings) => {
  const dailyData = {};

  // Group readings by day
  readings.forEach((reading) => {
    if (!reading || !reading.datetime) return;

    const date = new Date(reading.datetime);
    if (isNaN(date.getTime())) return;

    const dayKey = createDateKey(date);
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date,
        count: 0,
        pH: 0,
        temperature: 0,
        salinity: 0,
        turbidity: 0,
        pHCount: 0,
        tempCount: 0,
        salinityCount: 0,
        turbidityCount: 0,
      };
    }

    const dayData = dailyData[dayKey];
    dayData.count++;

    // Sum values for each parameter if they exist
    if (typeof reading.pH === "number") {
      dayData.pH += reading.pH;
      dayData.pHCount++;
    }
    if (typeof reading.temperature === "number") {
      dayData.temperature += reading.temperature;
      dayData.tempCount++;
    }
    if (typeof reading.salinity === "number") {
      dayData.salinity += reading.salinity;
      dayData.salinityCount++;
    }
    if (typeof reading.turbidity === "number") {
      dayData.turbidity += reading.turbidity;
      dayData.turbidityCount++;
    }
  });

  // Calculate averages
  return Object.values(dailyData).map((day) => ({
    date: day.date,
    pH: day.pHCount ? day.pH / day.pHCount : null,
    temperature: day.tempCount ? day.temperature / day.tempCount : null,
    salinity: day.salinityCount ? day.salinity / day.salinityCount : null,
    turbidity: day.turbidityCount ? day.turbidity / day.turbidityCount : null,
  }));
};

export const aggregateData = (readings, timeRange = "daily") => {
  if (!readings || readings.length === 0) {
    return { labels: [], datasets: { pH: [], temperature: [], salinity: [], turbidity: [] } };
  }

  const now = new Date();
  const datasets = { pH: [], temperature: [], salinity: [], turbidity: [] };
  let labels = [];

  if (timeRange === "daily") {
    labels = ["4AM", "8AM", "12PM", "4PM", "8PM", "12AM"];
    const intervals = Array(6).fill(null).map(() => ({ pH: [], temperature: [], salinity: [], turbidity: [] }));
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    readings.forEach(r => {
      const recordDate = new Date(r.datetime);
      if (recordDate >= todayStart) {
        const hour = recordDate.getHours();
        const intervalIndex = Math.floor(hour / 4);
        if (intervals[intervalIndex]) {
          if (r.pH != null) intervals[intervalIndex].pH.push(r.pH);
          if (r.temperature != null) intervals[intervalIndex].temperature.push(r.temperature);
          if (r.salinity != null) intervals[intervalIndex].salinity.push(r.salinity);
          if (r.turbidity != null) intervals[intervalIndex].turbidity.push(r.turbidity);
        }
      }
    });

    Object.keys(datasets).forEach(param => {
      datasets[param] = intervals.map(interval => {
        const data = interval[param];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : null;
      });
    });

  } else if (timeRange === "weekly") {
    labels = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
    const weeklyData = Array(7).fill(null).map(() => ({ pH: [], temperature: [], salinity: [], turbidity: [] }));
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    readings.forEach(r => {
      const recordDate = new Date(r.datetime);
      if (recordDate >= weekStart) {
        const dayIndex = 6 - Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          if (r.pH != null) weeklyData[dayIndex].pH.push(r.pH);
          if (r.temperature != null) weeklyData[dayIndex].temperature.push(r.temperature);
          if (r.salinity != null) weeklyData[dayIndex].salinity.push(r.salinity);
          if (r.turbidity != null) weeklyData[dayIndex].turbidity.push(r.turbidity);
        }
      }
    });

    Object.keys(datasets).forEach(param => {
      datasets[param] = weeklyData.map(day => {
        const data = day[param];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : null;
      });
    });

  } else if (timeRange === "monthly") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    const monthlyData = Array(daysInMonth).fill(null).map(() => ({ pH: [], temperature: [], salinity: [], turbidity: [] }));

    readings.forEach(r => {
      const recordDate = new Date(r.datetime);
      if (recordDate >= monthStart && recordDate.getMonth() === now.getMonth()) {
        const dayOfMonth = recordDate.getDate() - 1;
        if (r.pH != null) monthlyData[dayOfMonth].pH.push(r.pH);
        if (r.temperature != null) monthlyData[dayOfMonth].temperature.push(r.temperature);
        if (r.salinity != null) monthlyData[dayOfMonth].salinity.push(r.salinity);
        if (r.turbidity != null) monthlyData[dayOfMonth].turbidity.push(r.turbidity);
      }
    });

    Object.keys(datasets).forEach(param => {
      datasets[param] = monthlyData.map(day => {
        const data = day[param];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : null;
      });
    });
  }

  return { labels, datasets };
};

const formatDateKey = (date, timeRange) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  switch (timeRange.toLowerCase()) {
    case "daily":
      return `${year}-${month}-${day}`;
    case "weekly": {
      const firstDay = new Date(d);
      firstDay.setDate(d.getDate() - d.getDay());
      const weekYear = firstDay.getFullYear();
      const weekMonth = String(firstDay.getMonth() + 1).padStart(2, "0");
      const weekDay = String(firstDay.getDate()).padStart(2, "0");
      return `Week of ${weekYear}-${weekMonth}-${weekDay}`;
    }
    case "yearly":
      return `${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

/**
 * Evaluates a single reading against thresholds
 * @param {string} parameter - Parameter name (pH, temperature, etc.)
 * @param {number} value - Parameter value
 * @returns {Object} Evaluation result with status and message
 */
const evaluateParameter = (parameter, value) => {
  const thresholds = getWaterQualityThresholds();
  // Handle case sensitivity - try exact match first, then lowercase
  const paramThresholds =
    thresholds[parameter] || thresholds[parameter.toLowerCase()];

  if (!paramThresholds) {
    console.warn(
      `No thresholds found for parameter: ${parameter}. Available parameters:`,
      Object.keys(thresholds)
    );
    return {
      status: "unknown",
      message: "No thresholds defined for this parameter",
    };
  }

  const { min, max } = paramThresholds;

  if (value < min * 0.9 || value > max * 1.1) {
    return {
      status: "critical",
      message: `${parameter} is critically ${value < min ? "low" : "high"}`,
    };
  } else if (value < min * 0.95 || value > max * 1.05) {
    return {
      status: "warning",
      message: `${parameter} is ${value < min ? "low" : "high"}`,
    };
  }

  return {
    status: "normal",
    message: `${parameter} is within normal range`,
  };
};

/**
 * Analyzes trends in parameter data
 * @param {Array} values - Array of values over time
 * @param {Array} timestamps - Corresponding timestamps
 * @returns {Object} Trend analysis with percentage change and trend direction
 */
const analyzeTrend = (values, timestamps) => {
  if (!values || values.length < 2) {
    return {
      change: 0,
      direction: "stable",
      message: "Insufficient data for trend analysis",
    };
  }

  const firstValid = values.findIndex((v) => v !== null && v !== undefined);
  const lastValid =
    values.length -
    1 -
    [...values].reverse().findIndex((v) => v !== null && v !== undefined);

  if (firstValid === -1 || lastValid === -1) {
    return {
      change: 0,
      direction: "stable",
      message: "No valid data points for trend analysis",
    };
  }

  const startValue = values[firstValid];
  const endValue = values[lastValid];
  const change = ((endValue - startValue) / startValue) * 100;

  let direction = "stable";
  if (Math.abs(change) < 5) {
    direction = "stable";
  } else if (change > 0) {
    direction = "increasing";
  } else {
    direction = "decreasing";
  }

  return {
    change: parseFloat(change.toFixed(2)),
    direction,
    message: `${Math.abs(change).toFixed(2)}% ${direction} over the period`,
  };
};

/**
 * Generates a comprehensive water quality report
 * @param {Array} readings - Array of sensor readings
 * @param {string} timeRange - Time range for the report
 * @returns {Object} Complete report with analysis and recommendations
 */
export const generateWaterQualityReport = (readings, timeRange = "weekly") => {
  console.log("Generating water quality report with time range:", timeRange);
  console.log("Input readings count:", readings?.length || 0);

  if (!readings || !Array.isArray(readings) || readings.length === 0) {
    console.log("No valid readings provided for report generation");
    return {
      status: "error",
      message: "No data available for the selected time period",
      parameters: {},
      overallStatus: "unknown",
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // Filter out invalid readings
  const validReadings = readings.filter((r) => r && r.datetime);

  // Log first few readings to check pH values
  console.log("First 3 readings with pH values:");
  validReadings.slice(0, 3).forEach((reading, i) => {
    console.log(`Reading ${i + 1}:`, {
      datetime: reading.datetime,
      pH: reading.pH,
      ph: reading.ph, // Check for lowercase 'ph'
      allKeys: Object.keys(reading),
      hasPH: "pH" in reading,
      has_ph: "ph" in reading,
    });
  });

  if (validReadings.length === 0) {
    console.log("No valid readings with datetime found");
    return {
      status: "error",
      message: "No valid data points found in the selected time period",
      parameters: {},
      overallStatus: "unknown",
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };
  }

  console.log(`Processing ${validReadings.length} valid readings`);

  // Aggregate data for the time period
  console.log("Starting data aggregation...");
  const aggregatedData = aggregateData(validReadings, timeRange);

  // Log the first few aggregated data points
  if (aggregatedData?.labels?.length > 0) {
    console.log("First 3 aggregated data points:");
    const paramKeys = Object.keys(aggregatedData.datasets || {});
    paramKeys.forEach((param) => {
      console.log(`Parameter '${param}':`, {
        values: aggregatedData.datasets[param]?.slice(0, 3) || [],
        count: aggregatedData.datasets[param]?.length || 0,
        hasNaN: aggregatedData.datasets[param]?.some(isNaN) || false,
      });
    });
  }

  // Check if we have any data after aggregation
  if (
    !aggregatedData ||
    !aggregatedData.labels ||
    aggregatedData.labels.length === 0 ||
    !aggregatedData.datasets ||
    typeof aggregatedData.datasets !== 'object'
  ) {
    console.log("No valid data structure after aggregation");
    return {
      status: "error",
      message: "No data available after aggregation",
      parameters: {},
      overallStatus: "unknown",
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };
  }

  console.log(
    `Generated ${aggregatedData.labels.length} data points for report`
  );

  // Analyze each parameter
  const parameters = ["pH", "temperature", "salinity", "turbidity"].reduce(
    (acc, param) => {
      // Handle case-insensitive parameter access
      const paramLower = param.toLowerCase();
      const paramKey =
        Object.keys(aggregatedData.datasets || {}).find(
          (key) => key.toLowerCase() === paramLower
        ) || paramLower; // Fallback to lowercase if not found

      const displayName = param; // Keep original for display

      // Debug: Log all available dataset keys and their types
      console.log(
        "Available dataset keys:",
        Object.entries(aggregatedData.datasets || {}).map(([key, values]) => ({
          key,
          type: Array.isArray(values) ? "array" : typeof values,
          length: Array.isArray(values) ? values.length : "N/A",
        }))
      );

      // Get values with case-insensitive access
      const values = Array.isArray(aggregatedData.datasets?.[paramKey])
        ? aggregatedData.datasets[paramKey]
        : [];

      // Filter out invalid values
      const validValues = values
        .map((v) => {
          const num = parseFloat(v);
          return isNaN(num) ? null : num;
        })
        .filter((v) => v !== null);

      console.log(`Processing ${displayName} (key: ${paramKey}):`, {
        values: validValues,
        valuesLength: validValues.length,
        firstFew: validValues.slice(0, 3),
        hasNaN: validValues.some(isNaN),
        hasNull: validValues.some((v) => v === null || v === undefined),
      });

      // Log detailed info about the first few values
      if (validValues.length > 0) {
        console.log(
          `Detailed values for ${displayName}:`,
          validValues.slice(0, 5).map((v, i) => ({
            index: i,
            value: v,
            type: typeof v,
            isNumber: typeof v === "number",
            isFinite: Number.isFinite(v),
            isNaN: isNaN(v),
          }))
        );
      }

      const avgValue =
        validValues.length > 0
          ? parseFloat(
              (
                validValues.reduce((a, b) => a + b, 0) / validValues.length
              ).toFixed(2)
            )
          : 0;

      console.log(`Calculated average for ${displayName}:`, avgValue);

      const evaluation = evaluateParameter(displayName, avgValue);
      const trend = analyzeTrend(values, aggregatedData.labels);

      // Use the original parameter name as the key in the result
      acc[displayName] = {
        average: avgValue,
        status: evaluation.status,
        trend: {
          change: trend.change,
          direction: trend.direction,
          message: trend.message,
        },
      chartData: {
        labels: aggregatedData.labels,
        values: values,
        timeRange: timeRange,
      },
      };

      return acc;
    },
    {}
  );

  // Determine overall status
  const statuses = Object.values(parameters).map((p) => p.status);
  let overallStatus = "good";
  if (statuses.includes("critical")) {
    overallStatus = "critical";
  } else if (statuses.includes("warning")) {
    overallStatus = "warning";
  }

  // Generate recommendations
  const recommendations = [];

  if (parameters.pH.status === "critical") {
    recommendations.push(
      parameters.pH.average < 6.5
        ? "Add pH buffer to increase pH level"
        : "Add fresh water or use pH reducer to lower pH level"
    );
  }

  if (parameters.temperature.status === "critical") {
    recommendations.push(
      parameters.temperature.average < 26
        ? "Consider using a water heater to raise temperature"
        : "Add shade or increase aeration to cool the water"
    );
  }

  if (parameters.salinity.status === "critical") {
    recommendations.push(
      parameters.salinity.average < 0
        ? "Add marine salt mix to increase salinity"
        : "Dilute with fresh water to reduce salinity"
    );
  }

  if (parameters.turbidity.status === "critical") {
    recommendations.push(
      "Improve filtration and reduce feeding to lower turbidity"
    );
  }

  // Add trend-based recommendations
  if (
    parameters.pH.trend.direction === "increasing" &&
    Math.abs(parameters.pH.trend.change) > 10
  ) {
    recommendations.push("Monitor pH closely as it is rising significantly");
  }

  if (
    parameters.temperature.trend.direction === "increasing" &&
    parameters.temperature.average > 28
  ) {
    recommendations.push(
      "Consider cooling measures as temperature is trending up"
    );
  }

  // Debug log the final parameters
  console.log("Final parameters before returning report:", {
    pH: parameters.pH,
    temperature: parameters.temperature,
    salinity: parameters.salinity,
    turbidity: parameters.turbidity,
  });

  return {
    status: "success",
    timeRange,
    parameters,
    overallStatus,
    recommendations:
      recommendations.length > 0
        ? [...new Set(recommendations)] // Remove duplicates
        : [
            "All parameters are within normal ranges. Maintain current conditions.",
          ],
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Prepares data for react-native-chart-kit
 * @param {Object} report - The report object from generateWaterQualityReport
 * @param {string} parameter - Parameter to get chart data for
 * @returns {Object} Formatted data for react-native-chart-kit
 */
export const prepareChartData = (report, parameter) => {
  if (
    !report ||
    !report.parameters ||
    !report.parameters[parameter] ||
    !report.parameters[parameter].chartData
  ) {
    return {
      labels: [],
      datasets: [{ data: [] }],
      legend: [],
    };
  }

  const paramData = report.parameters[parameter];
  const chartData = paramData.chartData;

  const formattedData = chartData.values || [];
  const formattedLabels = chartData.labels || [];

  // Define colors for different parameters
  const getParameterColor = (opacity = 1) => {
    // Use different colors for different parameters
    const colors = {
      ph: `rgba(75, 192, 192, ${opacity})`, // Teal
      temperature: `rgba(255, 99, 132, ${opacity})`, // Red
      salinity: `rgba(54, 162, 235, ${opacity})`, // Blue
      turbidity: `rgba(255, 206, 86, ${opacity})`, // Yellow
    };

    return colors[parameter.toLowerCase()] || `rgba(201, 203, 207, ${opacity})`; // Gray as fallback
  };

  return {
    labels: formattedLabels,
    datasets: [
      {
        data: formattedData,
        color: getParameterColor,
        strokeWidth: 2,
        barPercentage: 0.8,
        barRadius: 4,
        fill: false,
        tension: 0.4, // Add slight curve to the line
      },
    ],
    legend: [`${parameter} (${paramData.average?.toFixed(2) || "N/A"} avg)`],
    timeRange: chartData.timeRange || "daily",
    parameter: parameter.toLowerCase(),
  };
};
