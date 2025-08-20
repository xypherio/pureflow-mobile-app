import { fetchAllDocuments } from "@services/firebase/firestore";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from "date-fns";

// --- Configuration ---
const WQI_PARAMS = {
  pH: { weight: 0.22, ideal: 7.0, range: [0, 14] },
  turbidity: { weight: 0.28, ideal: 0, range: [0, 100] },
  temperature: { weight: 0.22, ideal: 25, range: [0, 50] },
  salinity: { weight: 0.28, ideal: 0, range: [0, 5] },
};

const PARAMETER_THRESHOLDS = {
  pH: { good: [6.5, 8.5], fair: [6.0, 9.0] },
  turbidity: { good: [0, 500], fair: [501, 1000] },
  temperature: { good: [20, 30], fair: [15, 35] },
  salinity: { good: [0, 0.5], fair: [0.51, 1.0] },
};

// Parameter name mapping to handle different variations from database
const PARAMETER_NAME_MAP = {
  'ph': 'pH',
  'turbidity': 'turbidity',
  'temperature': 'temperature',
  'salinity': 'salinity',
  // Add any other variations that might exist in the database
  'turbidty': 'turbidity', // Handle the typo that was in the UI
  'temp': 'temperature',
  'conductivity': 'salinity', // Some systems use conductivity instead of salinity
  'tds': 'salinity', // Total dissolved solids
};

const normalizeParameterName = (paramName) => {
  const normalized = paramName.toLowerCase();
  return PARAMETER_NAME_MAP[normalized] || paramName;
};

// --- Helper Functions ---

// Robustly extract a JavaScript Date from various timestamp shapes
const extractDate = (doc) => {
  try {
    if (!doc) return null;
    const dt = doc.datetime ?? doc.timestamp;
    if (!dt) return null;
    // Firestore Timestamp
    if (dt && typeof dt.toDate === 'function') return dt.toDate();
    // Firestore Timestamp-like
    if (dt && typeof dt.seconds === 'number') return new Date(dt.seconds * 1000);
    // JavaScript Date
    if (dt instanceof Date) return dt;
    // ISO string
    if (typeof dt === 'string') {
      const parsed = new Date(dt);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    // Millis number
    if (typeof dt === 'number') return new Date(dt);
  } catch (_) {
    return null;
  }
  return null;
};

const getDateRange = (period) => {
  const now = new Date();
  switch (period) {
    case "weekly":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "annually":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "daily":
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};

const getParameterStatus = (param, value) => {
  console.log(`Getting status for parameter: ${param}, value: ${value}`);
  const thresholds = PARAMETER_THRESHOLDS[param];
  if (!thresholds) {
    console.warn(`No thresholds found for parameter: ${param}`);
    return "N/A";
  }

  console.log(`Thresholds for ${param}:`, thresholds);
  const [goodMin, goodMax] = thresholds.good;
  if (value >= goodMin && value <= goodMax) {
    console.log(`${param} value ${value} is in good range [${goodMin}, ${goodMax}]`);
    return "normal";
  }

  const [fairMin, fairMax] = thresholds.fair;
  if (value >= fairMin && value <= fairMax) {
    console.log(`${param} value ${value} is in fair range [${fairMin}, ${fairMax}]`);
    return "moderate";
  }

  console.log(`${param} value ${value} is outside all ranges, marking as bad`);
  return "bad";
};

const calculateWQI = (averages) => {
  let wqi = 0;
  let validParamsCount = 0;
  
  for (const param in averages) {
    if (WQI_PARAMS[param]) {
      const { weight, ideal, range } = WQI_PARAMS[param];
      const value = averages[param];
      const [min, max] = range;
      
      // Skip if value is not a valid number
      if (typeof value !== 'number' || isNaN(value)) {
        console.warn(`Invalid value for parameter ${param}:`, value);
        continue;
      }
      
      // Normalize the value to a 0-100 scale where 100 is ideal
      const qualityRating = 100 - (Math.abs(value - ideal) / (max - min)) * 100;
      wqi += qualityRating * weight;
      validParamsCount++;
    }
  }
  
  console.log(`WQI calculation: ${validParamsCount} valid parameters, total WQI: ${wqi}`);
  
  if (validParamsCount === 0) {
    console.warn('No valid parameters for WQI calculation');
    return 0;
  }
  
  return Math.max(0, Math.min(100, wqi)); // Clamp between 0 and 100
};

const getWQIStatus = (wqi) => {
  if (wqi >= 90) return "Excellent";
  if (wqi >= 70) return "Good";
  if (wqi >= 50) return "Fair";
  return "Poor";
};

const processChartData = (data, period) => {
  console.log(`Processing chart data for period: ${period} with ${data.length} records.`);
  if (!data || data.length === 0) return { labels: [], datasets: [{ data: [] }] };

  // Define the expected time periods and their labels
  let expectedPeriods = [];
  let getGroupKey;
  let getLabel;
  let getDateRange;
  
  switch (period) {
    case 'daily':
      // For daily, show hours 00:00 to 23:00
      expectedPeriods = Array.from({ length: 24 }, (_, i) => i);
      getGroupKey = (date) => format(date, 'yyyy-MM-dd-HH');
      getLabel = (hour) => {
        const hourStr = hour.toString().padStart(2, '0');
        return `${hourStr}:00`;
      };
      getDateRange = () => {
        const now = new Date();
        const start = startOfDay(now);
        const end = endOfDay(now);
        return { start, end };
      };
      break;
      
    case 'weekly':
      // For weekly, show Monday to Sunday
      expectedPeriods = [1, 2, 3, 4, 5, 6, 0]; // Monday = 1, Sunday = 0
      getGroupKey = (date) => format(date, 'yyyy-MM-dd');
      getLabel = (dayOfWeek) => {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        // Map dayOfWeek to correct index (1=Mon, 2=Tue, ..., 0=Sun)
        const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return dayNames[index];
      };
      getDateRange = () => {
        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return { start, end };
      };
      break;
      
    case 'monthly':
      // For monthly, show days 1 to 31 (or actual month length)
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      expectedPeriods = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      getGroupKey = (date) => format(date, 'yyyy-MM-dd');
      getLabel = (day) => day.toString();
      getDateRange = () => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        return { start, end };
      };
      break;
      
    case 'annually':
      // For annually, show January to December
      expectedPeriods = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // January = 0, December = 11
      getGroupKey = (date) => format(date, 'yyyy-MM');
      getLabel = (month) => format(new Date(2024, month, 1), 'MMM');
      getDateRange = () => {
        const now = new Date();
        const start = startOfYear(now);
        const end = endOfYear(now);
        return { start, end };
      };
      break;
      
    default:
      return { labels: [], datasets: [{ data: [] }] };
  }

  // Get the date range for the selected period
  const { start, end } = getDateRange();
  console.log(`Processing data for period: ${period}, from ${start.toISOString()} to ${end.toISOString()}`);
  console.log(`Total data records: ${data.length}`);

  // Filter data to only include records within the selected period
  const periodData = data.filter(doc => {
    const date = extractDate(doc);
    if (!date) return false;
    return date >= start && date <= end;
  });

  console.log(`Filtered ${periodData.length} records for period ${period}`);
  if (periodData.length === 0) {
    console.warn(`No data found for period ${period}, returning empty chart`);
    return { labels: [], datasets: [{ data: [], name: 'WQI', color: (opacity = 1) => `rgba(25, 165, 184, ${opacity})` }] };
  }

  // Group data by the appropriate time unit
  const groupedData = periodData.reduce((acc, doc) => {
    const date = extractDate(doc);
    if (!date) return acc;
    const key = getGroupKey(date);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {});

  console.log("Grouped data keys:", Object.keys(groupedData));
  console.log("Grouped data sample:", Object.keys(groupedData).slice(0, 3).map(key => ({ key, count: groupedData[key].length })));

  // Calculate average WQI for each group
  const aggregatedWQI = Object.keys(groupedData).map(key => {
    const group = groupedData[key];
    const sums = {};
    const counts = {};
    Object.keys(WQI_PARAMS).forEach(param => {
      sums[param] = 0;
      counts[param] = 0;
    });

    group.forEach(doc => {
      Object.keys(WQI_PARAMS).forEach(param => {
        // Robust param lookup like in main report
        const normalizedParam = normalizeParameterName(param);
        let value = doc[param];
        if (value === undefined) value = doc[normalizedParam];
        if (value === undefined) value = doc[param.toLowerCase()];

        if (value === undefined) {
          const variations = {
            'temperature': ['temp', 'temperature'],
            'turbidity': ['turbidity', 'turbidty', 'turb'],
            'salinity': ['salinity', 'conductivity', 'tds', 'salt'],
            'pH': ['ph', 'ph_value', 'phvalue']
          };
          if (variations[param]) {
            for (const variation of variations[param]) {
              if (doc[variation] !== undefined) {
                value = doc[variation];
                break;
              }
            }
          }
        }

        if (value !== undefined && typeof value === 'number') {
          sums[param] += value;
          counts[param]++;
        }
      });
    });

    const averages = {};
    Object.keys(WQI_PARAMS).forEach(param => {
      averages[param] = counts[param] > 0 ? sums[param] / counts[param] : 0;
    });

    console.log(`Group ${key}:`, { averages, counts, sums });

    const wqi = calculateWQI(averages);
    console.log(`Group ${key} WQI: ${wqi}`);
    
    // Handle both datetime and timestamp fields for date reference
    const date = extractDate(group[0]);
    if (!date) {
      console.warn('Group has no valid datetime or timestamp field:', group[0]);
      return null;
    }
    return { key, wqi, date };
  }).filter(item => item !== null); // Filter out null results

  // Sort by date to ensure chronological order
  aggregatedWQI.sort((a, b) => a.date - b.date);
  console.log("Aggregated and sorted WQI:", aggregatedWQI);

  // Create complete data arrays with default values for missing periods
  const labels = [];
  const wqiData = [];
  
  expectedPeriods.forEach((periodValue, index) => {
    // Add label
    labels.push(getLabel(periodValue));
    
    // Find corresponding data or use default value
    let foundData = null;
    
    if (period === 'daily') {
      // For daily, find data for this hour
      foundData = aggregatedWQI.find(item => {
        const itemHour = new Date(item.date).getHours();
        return itemHour === periodValue;
      });
    } else if (period === 'weekly') {
      // For weekly, find data for this day of week
      foundData = aggregatedWQI.find(item => {
        const itemDayOfWeek = new Date(item.date).getDay();
        return itemDayOfWeek === periodValue;
      });
    } else if (period === 'monthly') {
      // For monthly, find data for this day of month
      foundData = aggregatedWQI.find(item => {
        const itemDayOfMonth = new Date(item.date).getDate();
        return itemDayOfMonth === periodValue;
      });
    } else if (period === 'annually') {
      // For annually, find data for this month
      foundData = aggregatedWQI.find(item => {
        const itemMonth = new Date(item.date).getMonth();
        return itemMonth === periodValue;
      });
    }
    
    // Use found data or default to 0
    const wqiValue = foundData ? foundData.wqi : 0;
    wqiData.push(wqiValue);
    
    if (foundData) {
      console.log(`Found data for ${period} period ${periodValue}: WQI = ${wqiValue}`);
    } else {
      console.log(`No data found for ${period} period ${periodValue}, using default: 0`);
    }
  });

  console.log("Final chart labels:", labels);
  console.log("Final chart data:", wqiData);
  console.log("Expected periods count:", expectedPeriods.length);
  console.log("Generated labels count:", labels.length);
  console.log("Generated data count:", wqiData.length);

  // Validate the data structure
  if (labels.length !== wqiData.length) {
    console.error('Mismatch between labels and data length:', { labels: labels.length, data: wqiData.length });
  }

  // Ensure all data values are numbers
  const validatedData = wqiData.map((value, index) => {
    if (typeof value !== 'number' || isNaN(value)) {
      console.warn(`Invalid data value at index ${index}: ${value}, setting to 0`);
      return 0;
    }
    return value;
  });

  // Ensure we have at least one data point
  if (validatedData.length === 0) {
    console.warn('No valid data points, returning empty chart');
    return { labels: [], datasets: [{ data: [] }] };
  }

  const result = {
    labels,
    datasets: [{ 
      data: validatedData,
      name: 'WQI', // Add name for the dataset
      color: (opacity = 1) => `rgba(25, 165, 184, ${opacity})` // Add color function
    }],
  };

  console.log("Final chart result:", result);
  return result;
};


// --- Main Exported Service ---

export const getWaterQualityReport = async (timePeriod = 'daily', preloadedRawData = null) => {
  try {
    let data = preloadedRawData;

    console.log(`🔄 getWaterQualityReport called with timePeriod: ${timePeriod}`);
    console.log(`📊 Preloaded data available: ${!!preloadedRawData}`);
    if (preloadedRawData) {
      console.log(`📊 Preloaded data length: ${preloadedRawData.length}`);
      if (preloadedRawData.length > 0) {
        console.log(`📊 Sample data structure:`, Object.keys(preloadedRawData[0]));
      }
    }

    if (!data) {
      const { start, end } = getDateRange(timePeriod);
      console.log(`Fetching data for period: ${timePeriod}`);
      data = await fetchAllDocuments("datm_data", {
          filters: [
              { field: "datetime", operator: ">=", value: start },
              { field: "datetime", operator: "<=", value: end },
          ],
          orderByField: "datetime",
          orderDirection: "asc",
      });
    }

    if (!data || data.length === 0) {
      console.warn('No data available for water quality report');
      return {
        wqi: { value: 0, status: "N/A" },
        parameters: {},
        chartData: { labels: [], datasets: [] },
        lastUpdated: new Date().toISOString(),
      };
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      console.error('Data is not an array:', typeof data);
      return null;
    }

    // Filter out invalid documents
    const validData = data.filter(doc => {
      if (!doc || typeof doc !== 'object') {
        console.warn('Invalid document found:', doc);
        return false;
      }
      return true;
    });

    if (validData.length === 0) {
      console.warn('No valid documents found after filtering');
      return {
        wqi: { value: 0, status: "N/A" },
        parameters: {},
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastUpdated: new Date().toISOString(),
      };
    }

    console.log(`Processing ${validData.length} valid documents out of ${data.length} total`);

    // Debug: Log the structure of the first document
    if (validData.length > 0) {
      console.log('Sample document structure:', Object.keys(validData[0]));
      console.log('Sample document values:', validData[0]);
      
      // Check what parameters are actually available in the data
      const availableParams = new Set();
      validData.forEach(doc => {
        Object.keys(doc).forEach(key => {
          if (typeof doc[key] === 'number' && key !== 'timestamp' && key !== 'datetime') {
            availableParams.add(key);
          }
        });
      });
      console.log('Available numeric parameters in data:', Array.from(availableParams));
      
      // Check if we have any of the expected parameters
      const expectedParams = Object.keys(WQI_PARAMS);
      const foundParams = expectedParams.filter(param => availableParams.has(param));
      console.log('Expected parameters:', expectedParams);
      console.log('Found parameters:', foundParams);
      console.log('Missing parameters:', expectedParams.filter(param => !availableParams.has(param)));
    }

    const averages = {};
    const sums = {};
    const counts = {};

    Object.keys(WQI_PARAMS).forEach(param => {
        sums[param] = 0;
        counts[param] = 0;
    });

    validData.forEach(doc => {
        Object.keys(WQI_PARAMS).forEach(param => {
            // Try to find the parameter in the document using normalized names
            const normalizedParam = normalizeParameterName(param);
            let value = doc[param];
            
            // If not found with original name, try normalized name
            if (value === undefined) {
              value = doc[normalizedParam];
            }
            
            // If still not found, try lowercase version
            if (value === undefined) {
              value = doc[param.toLowerCase()];
            }
            
            // If still not found, try common variations
            if (value === undefined) {
              const variations = {
                'temperature': ['temp', 'temperature'],
                'turbidity': ['turbidity', 'turbidty', 'turb'],
                'salinity': ['salinity', 'conductivity', 'tds', 'salt'],
                'pH': ['ph', 'ph_value', 'phvalue']
              };
              
              if (variations[param]) {
                for (const variation of variations[param]) {
                  if (doc[variation] !== undefined) {
                    value = doc[variation];
                    console.log(`Found parameter ${param} using variation: ${variation}`);
                    break;
                  }
                }
              }
            }
            
            if (value !== undefined && typeof value === 'number') {
                sums[param] += value;
                counts[param]++;
                console.log(`Found parameter ${param}: ${value}`);
            } else {
                console.log(`Parameter ${param} not found or not numeric in document. Available keys:`, Object.keys(doc));
            }
        });
    });

    console.log('Available parameters in data:', Object.keys(WQI_PARAMS));
    console.log('Parameter sums:', sums);
    console.log('Parameter counts:', counts);
    console.log('Calculated averages:', averages);

    Object.keys(WQI_PARAMS).forEach(param => {
        averages[param] = counts[param] > 0 ? sums[param] / counts[param] : 0;
    });

    // Check if we have any valid parameter data
    const validParams = Object.keys(averages).filter(param => counts[param] > 0);
    console.log('Valid parameters found:', validParams);
    console.log('Parameter averages:', averages);

    if (validParams.length === 0) {
      console.warn('No valid parameter data found for WQI calculation');
      return {
        wqi: { value: 0, status: "N/A" },
        parameters: {},
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastUpdated: new Date().toISOString(),
      };
    }

    const wqiValue = calculateWQI(averages);
    const wqiStatus = getWQIStatus(wqiValue);

    const parameterDetails = {};
    Object.keys(averages).forEach(param => {
        console.log(`Processing parameter: ${param}, value: ${averages[param]}`);
        
        // Only include parameters that have valid data
        if (counts[param] > 0 && typeof averages[param] === 'number' && !isNaN(averages[param])) {
          const status = getParameterStatus(param, averages[param]);
          console.log(`Parameter ${param}: value=${averages[param].toFixed(2)}, status=${status}`);
          
          parameterDetails[param] = {
              value: averages[param].toFixed(2),
              status: status,
          };
        } else {
          console.warn(`Skipping parameter ${param}: invalid data or no readings`);
        }
    });

    console.log('Final parameter details:', parameterDetails);
    console.log('Parameter details keys:', Object.keys(parameterDetails));

    let chartData = processChartData(validData, timePeriod);
    
    // Validate chart data
    if (!chartData || !chartData.labels || !chartData.datasets) {
      console.warn('Invalid chart data generated, using fallback');
      chartData = { labels: [], datasets: [{ data: [] }] };
    }

    console.log('Final report data:', {
      wqi: { value: wqiValue.toFixed(0), status: wqiStatus },
      parametersCount: Object.keys(parameterDetails).length,
      chartDataPoints: chartData.datasets?.[0]?.data?.length || 0
    });

    const finalResult = {
      wqi: { value: wqiValue.toFixed(0), status: wqiStatus },
      parameters: parameterDetails,
      chartData,
      lastUpdated: new Date().toISOString(),
    };

    console.log('Final report result:', finalResult);
    console.log('Chart data in final result:', finalResult.chartData);
    return finalResult;

  } catch (error) {
    console.error("Error generating water quality report:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      timePeriod,
      dataLength: preloadedRawData?.length || 0
    });
    return null; // Or return a default error state
  }
};

