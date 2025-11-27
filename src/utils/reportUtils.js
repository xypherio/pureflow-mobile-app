import { getWaterQualityThresholdsFromSettings } from "../constants/thresholds";
import { WaterQualityCalculator } from "../services/core/WaterQualityCalculator";

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

const normalizeNumber = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveValue = (reading, keys) => {
  for (const key of keys) {
    if (key in reading) {
      const normalized = normalizeNumber(reading[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }
  return null;
};

const getTimeRangeBounds = (referenceDate, timeRange) => {
  if (!referenceDate || isNaN(referenceDate.getTime())) {
    return null;
  }

  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (timeRange) {
    case "weekly": {
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "monthly": {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate());
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "daily":
    default:
      break;
  }

  return { start, end };
};

const filterReadingsByBounds = (readings, bounds) => {
  if (!bounds) return readings;
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  return readings.filter((reading) => {
    if (!reading?.datetime) return false;
    const time = reading.datetime.getTime();
    return time >= startMs && time <= endMs;
  });
};

export const aggregateData = (readings, timeRange = "daily") => {
  const params = ["pH", "temperature", "salinity", "turbidity"];

  const emptyResult = {
    labels: [],
    datasets: params.reduce((acc, key) => ({ ...acc, [key]: [] }), {}),
    filteredReadings: [],
    latestReadingDate: null,
  };

  if (!readings || readings.length === 0) {
    return emptyResult;
  }

  const sanitizedReadings = readings
    .map((reading) => {
      if (!reading?.datetime) return null;
      const datetime = new Date(reading.datetime);
      if (isNaN(datetime.getTime())) return null;

      const pH = resolveValue(reading, ["pH", "ph", "PH", "Ph"]);
      const temperature = resolveValue(reading, ["temperature", "Temperature", "temp", "Temp"]);
      const salinity = resolveValue(reading, ["salinity", "Salinity"]);
      const turbidity = resolveValue(reading, ["turbidity", "Turbidity"]);

      const meta = reading._meta || reading.meta || reading.metadata || {};
      const getMetaCount = (paramKey, value) => {
        const directKey = `${paramKey}_count`;
        const lowerKey = `${paramKey.toLowerCase()}_count`;
        const upperKey = `${paramKey.toUpperCase()}_COUNT`;

        const metaValue =
          typeof meta[directKey] === "number"
            ? meta[directKey]
            : typeof meta[lowerKey] === "number"
            ? meta[lowerKey]
            : typeof meta[upperKey] === "number"
            ? meta[upperKey]
            : undefined;

        if (typeof metaValue === "number" && Number.isFinite(metaValue) && metaValue >= 0) {
          return metaValue;
        }

        const normalizedValue = Number(value);
        return Number.isFinite(normalizedValue) ? 1 : 0;
      };

      return {
        datetime,
        pH,
        temperature,
        salinity,
        turbidity,
        counts: {
          pH: getMetaCount("pH", pH),
          temperature: getMetaCount("temperature", temperature),
          salinity: getMetaCount("salinity", salinity),
          turbidity: getMetaCount("turbidity", turbidity),
        },
      };
    })
    .filter(Boolean);

  if (!sanitizedReadings.length) {
    return emptyResult;
  }

  const latestReadingDate = new Date(
    Math.max(...sanitizedReadings.map((r) => r.datetime.getTime()))
  );

  const bounds =
    getTimeRangeBounds(latestReadingDate, timeRange) ||
    getTimeRangeBounds(latestReadingDate, "daily");

  const filteredReadings = filterReadingsByBounds(sanitizedReadings, bounds);

  if (!filteredReadings.length) {
    return { ...emptyResult, latestReadingDate };
  }

  const datasets = params.reduce((acc, key) => ({ ...acc, [key]: [] }), {});
  let labels = [];

  const createMetricAccumulator = () => ({
    sum: 0,
    totalWeight: 0,
    min: null,
    max: null,
    samples: 0,
  });

  const initializeMetricStore = () =>
    params.reduce((acc, key) => {
      acc[key] = createMetricAccumulator();
      return acc;
    }, {});

  const updateMetric = (metric, value, weight = 1, sampleIncrement = 1) => {
    if (
      metric &&
      Number.isFinite(value) &&
      Number.isFinite(weight) &&
      weight > 0
    ) {
      metric.sum += value * weight;
      metric.totalWeight += weight;
      if (
        Number.isFinite(sampleIncrement) &&
        sampleIncrement > 0
      ) {
        metric.samples += sampleIncrement;
      }
      metric.min = metric.min === null ? value : Math.min(metric.min, value);
      metric.max = metric.max === null ? value : Math.max(metric.max, value);
    }
  };

  const extractWeight = (reading, param, value) => {
    const baseValue = Number(value);
    if (!Number.isFinite(baseValue)) return 0;

    const counts = reading?.counts;
    const meta = reading?._meta || reading?.meta || {};
    const weightCandidates = [
      counts?.[param],
      meta?.[`${param}_count`],
      meta?.[`${param.toLowerCase()}_count`],
      meta?.[`${param.toUpperCase()}_COUNT`],
      meta?.count,
      reading?.count,
    ];

    for (const candidate of weightCandidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
        return candidate;
      }
    }

    return baseValue !== null ? 1 : 0;
  };

  const normalizedRange = ["daily", "weekly", "monthly"].includes(timeRange)
    ? timeRange
    : "daily";

  const periodAccumulator = initializeMetricStore();

  if (normalizedRange === "daily") {
    const start = new Date(bounds.start);
    const end = new Date(bounds.end);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const bucketSizeMs = 3 * 60 * 60 * 1000; // 3-hour buckets
    const totalDurationMs = Math.max(endMs - startMs, bucketSizeMs);
    const bucketCount = Math.max(
      1,
      Math.ceil(totalDurationMs / bucketSizeMs)
    );

    const buckets = Array.from({ length: bucketCount }, () =>
      initializeMetricStore()
    );

    labels = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(startMs + index * bucketSizeMs);
      const hours = bucketStart.getHours();
      const suffix = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${displayHour}${suffix}`;
    });

    const sortedReadings = [...filteredReadings]
      .filter((reading) => reading.datetime)
      .sort((a, b) => a.datetime - b.datetime);

    const intervalCandidates = [];
    for (let i = 1; i < sortedReadings.length; i += 1) {
      const prev = sortedReadings[i - 1]?.datetime?.getTime();
      const current = sortedReadings[i]?.datetime?.getTime();
      if (
        Number.isFinite(prev) &&
        Number.isFinite(current)
      ) {
        const diff = current - prev;
        if (diff > 0) {
          intervalCandidates.push(diff);
        }
      }
    }

    const medianInterval = (() => {
      if (!intervalCandidates.length) {
        return 2 * 60 * 60 * 1000;
      }
      const sortedDiffs = intervalCandidates.sort((a, b) => a - b);
      const mid = Math.floor(sortedDiffs.length / 2);
      if (sortedDiffs.length % 2 === 0) {
        return Math.round((sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2);
      }
      return sortedDiffs[mid];
    })();

    const estimatedIntervalMs = Math.min(
      Math.max(medianInterval, 15 * 60 * 1000),
      6 * 60 * 60 * 1000
    );

    sortedReadings.forEach((reading, index) => {
      const readingStartOriginal = reading.datetime?.getTime();
      if (!Number.isFinite(readingStartOriginal)) {
        return;
      }

      const readingStartMs = Math.max(startMs, readingStartOriginal);
      if (readingStartMs >= endMs) {
        return;
      }

      const nextStartOriginal =
        index < sortedReadings.length - 1
          ? sortedReadings[index + 1]?.datetime?.getTime()
          : null;

      let readingEndMs = readingStartMs + estimatedIntervalMs;
      if (
        Number.isFinite(nextStartOriginal) &&
        nextStartOriginal > readingStartMs
      ) {
        readingEndMs = Math.min(readingEndMs, nextStartOriginal);
      }
      readingEndMs = Math.min(readingEndMs, endMs);
      if (readingEndMs <= readingStartMs) {
        readingEndMs = Math.min(
          endMs,
          readingStartMs + estimatedIntervalMs
        );
      }
      if (readingEndMs <= readingStartMs) {
        return;
      }

      const effectiveDuration = readingEndMs - readingStartMs;
      if (effectiveDuration <= 0) {
        return;
      }

      params.forEach((param) => {
        const value = reading[param];
        if (value === null || value === undefined) {
          return;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return;
        }

        const firstBucket = Math.max(
          0,
          Math.floor((readingStartMs - startMs) / bucketSizeMs)
        );
        const lastBucket = Math.min(
          bucketCount - 1,
          Math.floor(
            (readingEndMs - 1 - startMs) / bucketSizeMs
          )
        );

        for (
          let bucketIndex = firstBucket;
          bucketIndex <= lastBucket;
          bucketIndex += 1
        ) {
          const bucketStartMs = startMs + bucketIndex * bucketSizeMs;
          const bucketEndMs = bucketStartMs + bucketSizeMs;
          const overlapStart = Math.max(bucketStartMs, readingStartMs);
          const overlapEnd = Math.min(bucketEndMs, readingEndMs);
          const overlap = overlapEnd - overlapStart;

          if (overlap <= 0) {
            continue;
          }

          const sampleIncrement = overlap / effectiveDuration;

          updateMetric(
            buckets[bucketIndex][param],
            numericValue,
            overlap,
            sampleIncrement
          );
          updateMetric(
            periodAccumulator[param],
            numericValue,
            overlap,
            sampleIncrement
          );
        }
      });
    });

    params.forEach((param) => {
      datasets[param] = buckets.map((bucket) => {
        const metric = bucket[param];
        if (!metric || !metric.totalWeight) return null;
        const average = metric.sum / metric.totalWeight;
        return Number.isFinite(average) ? parseFloat(average.toFixed(2)) : null;
      });
    });
  } else if (normalizedRange === "weekly") {
    const start = new Date(bounds.start);
    const end = new Date(bounds.end);
    const dayMs = 24 * 60 * 60 * 1000;

    const buckets = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      day.setHours(0, 0, 0, 0);

      const bucketStart = new Date(day);
      const bucketEnd = new Date(day);
      bucketEnd.setHours(23, 59, 59, 999);

      return {
        start: bucketStart,
        end: bucketEnd,
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        metrics: initializeMetricStore(),
      };
    });

    labels = buckets.map((bucket) => bucket.label);

    filteredReadings.forEach((reading) => {
      if (reading.datetime < start || reading.datetime > end) {
        return;
      }

      const dayIndex = Math.floor(
        (reading.datetime.getTime() - start.getTime()) / dayMs
      );

      if (dayIndex < 0 || dayIndex >= buckets.length) {
        return;
      }

      const bucket = buckets[dayIndex];

      params.forEach((param) => {
        const value = reading[param];
        if (value === null || value === undefined) {
          return;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return;
        }
        const weight = extractWeight(reading, param, numericValue);
        if (weight <= 0) {
          return;
        }

        updateMetric(bucket.metrics[param], numericValue, weight);
        updateMetric(periodAccumulator[param], numericValue, weight);
      });
    });

    params.forEach((param) => {
      datasets[param] = buckets.map((bucket) => {
        const metric = bucket.metrics[param];
        if (!metric || !metric.totalWeight) return null;
        const average = metric.sum / metric.totalWeight;
        return Number.isFinite(average) ? parseFloat(average.toFixed(2)) : null;
      });
    });
  } else if (normalizedRange === "monthly") {
    const start = new Date(bounds.start);
    const end = new Date(bounds.end);
    const daysInMonth = end.getDate();

    labels = Array.from({ length: daysInMonth }, (_, index) =>
      (index + 1).toString()
    );

    const buckets = Array.from({ length: daysInMonth }, () => ({
      metrics: initializeMetricStore(),
    }));

    filteredReadings.forEach((reading) => {
      if (reading.datetime < start || reading.datetime > end) {
        return;
      }

      const dayIndex = reading.datetime.getDate() - 1;
      if (dayIndex < 0 || dayIndex >= buckets.length) {
        return;
      }

      const bucket = buckets[dayIndex];

      params.forEach((param) => {
        const value = reading[param];
        if (value === null || value === undefined) {
          return;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return;
        }
        const weight = extractWeight(reading, param, numericValue);
        if (weight <= 0) {
          return;
        }

        updateMetric(bucket.metrics[param], numericValue, weight);
        updateMetric(periodAccumulator[param], numericValue, weight);
      });
    });

    params.forEach((param) => {
      datasets[param] = buckets.map((bucket) => {
        const metric = bucket.metrics[param];
        if (!metric || !metric.totalWeight) return null;
        const average = metric.sum / metric.totalWeight;
        return Number.isFinite(average) ? parseFloat(average.toFixed(2)) : null;
      });
    });
  }

  const periodStats = params.reduce((acc, param) => {
    const metric = periodAccumulator[param];
    const hasData = metric && metric.totalWeight > 0;
    acc[param] = {
      average: hasData
        ? parseFloat((metric.sum / metric.totalWeight).toFixed(2))
        : null,
      min:
        hasData && metric.min !== null
          ? parseFloat(metric.min.toFixed(2))
          : null,
      max:
        hasData && metric.max !== null
          ? parseFloat(metric.max.toFixed(2))
          : null,
      totalWeight: hasData ? metric.totalWeight : 0,
      count: metric?.samples ?? 0,
    };
    return acc;
  }, {});

  return { labels, datasets, filteredReadings, latestReadingDate, periodStats };
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
 * @returns {Promise<Object>} Promise that resolves to evaluation result with status and message
 */
const evaluateParameter = async (parameter, value) => {
  const thresholds = await getWaterQualityThresholdsFromSettings();
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
 * @returns {Promise<Object>} Promise that resolves to complete report with analysis and recommendations
 */
export const generateWaterQualityReport = async (readings, timeRange = "weekly") => {
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

  // Log the structure of the incoming data
  console.log('📦 Input data structure:', {
    isArray: Array.isArray(readings),
    length: readings?.length || 0,
    firstItem: readings?.[0] ? {
      ...readings[0],
      datetime: readings[0].datetime,
      hasPH: 'pH' in readings[0],
      hasDatetime: 'datetime' in readings[0],
      keys: Object.keys(readings[0] || {})
    } : 'No data',
  });

  // Filter out invalid readings - be more lenient with validation
  const validReadings = readings.filter((r) => {
    if (!r) return false;
    
    // Convert datetime if it's a string
    if (r.datetime && typeof r.datetime === 'string') {
      try {
        r.datetime = new Date(r.datetime);
      } catch (e) {
        console.warn('⚠️ Invalid datetime format:', r.datetime);
        return false;
      }
    }
    
    // Check if we have at least one valid parameter
    const hasValidParameter = ['pH', 'temperature', 'salinity', 'turbidity'].some(
      param => param in r && r[param] !== undefined && r[param] !== null
    );
    
    if (!hasValidParameter) {
      console.warn('⚠️ No valid parameters in reading:', {
        datetime: r.datetime,
        keys: Object.keys(r),
        values: Object.entries(r).reduce((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {})
      });
    }
    
    return hasValidParameter;
  });

  // Log first few readings to check values
  console.log(`🔍 First ${Math.min(3, validReadings.length)} of ${validReadings.length} valid readings:`);
  validReadings.slice(0, 3).forEach((reading, i) => {
    console.log(`   Reading ${i + 1}:`, {
      datetime: reading.datetime,
      pH: reading.pH,
      temperature: reading.temperature,
      salinity: reading.salinity,
      turbidity: reading.turbidity,
      hasPH: 'pH' in reading,
      hasDatetime: 'datetime' in reading,
      keys: Object.keys(reading)
    });
  });

  if (validReadings.length === 0) {
    console.error("❌ No valid readings found after filtering");
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
  const filteredReadingsForStats =
    aggregatedData?.filteredReadings?.length
      ? aggregatedData.filteredReadings
      : validReadings;

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
    async (acc, param) => {
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

      // Filter out invalid values for chart/trend analysis
      const validValues = values
        .map((v) => {
          const num = parseFloat(v);
          return isNaN(num) ? null : num;
        })
        .filter((v) => v !== null);

      // Prefer aggregated period statistics when available
      const periodStatsForParam =
        aggregatedData?.periodStats?.[displayName] ||
        aggregatedData?.periodStats?.[paramKey] ||
        null;

      let avgValue =
        typeof periodStatsForParam?.average === "number"
          ? periodStatsForParam.average
          : null;
      let minValue =
        typeof periodStatsForParam?.min === "number"
          ? periodStatsForParam.min
          : null;
      let maxValue =
        typeof periodStatsForParam?.max === "number"
          ? periodStatsForParam.max
          : null;
      let sampleCount =
        typeof periodStatsForParam?.count === "number"
          ? periodStatsForParam.count
          : 0;

      if (avgValue === null || !Number.isFinite(avgValue)) {
        const fallbackStats = filteredReadingsForStats.reduce(
          (acc, reading) => {
            const value = reading?.[param];
            if (value === null || value === undefined) {
              return acc;
            }

            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
              return acc;
            }

            const weightCandidate = reading?.counts?.[param];
            const weight =
              typeof weightCandidate === "number" &&
              Number.isFinite(weightCandidate) &&
              weightCandidate > 0
                ? weightCandidate
                : 1;

            acc.sum += numericValue * weight;
            acc.count += weight;
            acc.min =
              acc.min === null ? numericValue : Math.min(acc.min, numericValue);
            acc.max =
              acc.max === null ? numericValue : Math.max(acc.max, numericValue);
            return acc;
          },
          { sum: 0, count: 0, min: null, max: null }
        );

        if (fallbackStats.count > 0) {
          avgValue = parseFloat(
            (fallbackStats.sum / fallbackStats.count).toFixed(2)
          );
          minValue =
            fallbackStats.min !== null
              ? parseFloat(fallbackStats.min.toFixed(2))
              : null;
          maxValue =
            fallbackStats.max !== null
              ? parseFloat(fallbackStats.max.toFixed(2))
              : null;
          sampleCount = fallbackStats.count;
        } else {
          avgValue = null;
          minValue = null;
          maxValue = null;
          sampleCount = 0;
        }
      }

      console.log(`Calculated average for ${displayName}:`, avgValue);

      const evaluation =
        typeof avgValue === "number"
          ? await evaluateParameter(displayName, avgValue)
          : {
              status: "unknown",
              message: "No data available for this parameter",
            };
      const trend = analyzeTrend(values, aggregatedData.labels);

      // Use the original parameter name as the key in the result
      acc[displayName] = {
        average: avgValue,
        min: minValue,
        max: maxValue,
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
          sampleCount,
        },
      };

      return acc;
    },
    {}
  );

  // Determine overall status
  const statuses = Object.values(parameters).map((p) => p.status);
  let overallStatus =
    statuses.length > 0 && statuses.every((status) => status === "unknown")
      ? "unknown"
      : "good";
  if (statuses.includes("critical")) {
    overallStatus = "critical";
  } else if (statuses.includes("warning")) {
    overallStatus = "warning";
  }

  // Calculate Water Quality Index (WQI)
  const wqiCalculator = new WaterQualityCalculator();
  const wqiData = wqiCalculator.calculateWQI({
    pH: parameters.pH?.average,
    temperature: parameters.temperature?.average,
    turbidity: parameters.turbidity?.average,
    salinity: parameters.salinity?.average,
  });

  console.log("Calculated WQI:", wqiData);

  // Generate recommendations
  const recommendations = [];

  if (parameters.pH?.status === "critical") {
    recommendations.push(
      parameters.pH.average < 6.5
        ? "Add pH buffer to increase pH level"
        : "Add fresh water or use pH reducer to lower pH level"
    );
  }

  if (parameters.temperature?.status === "critical") {
    recommendations.push(
      parameters.temperature.average < 26
        ? "Consider using a water heater to raise temperature"
        : "Add shade or increase aeration to cool the water"
    );
  }

  if (parameters.salinity?.status === "critical") {
    recommendations.push(
      parameters.salinity.average < 0
        ? "Add marine salt mix to increase salinity"
        : "Dilute with fresh water to reduce salinity"
    );
  }

  if (parameters.turbidity?.status === "critical") {
    recommendations.push(
      "Improve filtration and reduce feeding to lower turbidity"
    );
  }

  // Add trend-based recommendations
  if (
    parameters.pH?.trend?.direction === "increasing" &&
    typeof parameters.pH?.trend?.change === "number" &&
    Math.abs(parameters.pH.trend.change) > 10
  ) {
    recommendations.push("Monitor pH closely as it is rising significantly");
  }

  if (
    parameters.temperature?.trend?.direction === "increasing" &&
    typeof parameters.temperature?.average === "number" &&
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
    wqi: wqiData || { value: 0, status: "unknown" },
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
