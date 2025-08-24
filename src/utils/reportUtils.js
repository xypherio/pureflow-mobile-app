import { getWaterQualityThresholds } from '../constants/thresholds';

// Time intervals in milliseconds
const TIME_INTERVALS = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

export const aggregateData = (readings, timeRange = 'daily') => {
  console.log('Aggregating data with time range:', timeRange);
  console.log('Input readings count:', readings?.length || 0);
  
  if (!readings || !Array.isArray(readings) || readings.length === 0) {
    console.log('No readings provided or empty array');
    return {
      labels: [],
      datasets: {
        pH: [],
        temperature: [],
        salinity: [],
        turbidity: []
      }
    };
  }

  // Filter out invalid readings and log them
  const validReadings = readings.filter(reading => {
    const isValid = reading && 
                   reading.datetime && 
                   (reading.pH !== undefined || 
                    reading.temperature !== undefined || 
                    reading.salinity !== undefined || 
                    reading.turbidity !== undefined);
    
    if (!isValid) {
      console.log('Invalid reading filtered out:', reading);
    }
    return isValid;
  });

  console.log('Valid readings count:', validReadings.length);
  
  // Sort readings by datetime
  validReadings.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  // Initialize groups object to store aggregated data
  const groups = {};
  
  // Process each reading into time-based groups
  validReadings.forEach((reading, index) => {
    try {
      // Log the raw reading before any processing
      if (index < 3) {
        console.log(`Raw reading ${index}:`, JSON.parse(JSON.stringify(reading)));
      }
      
      // Normalize parameter names in the reading
      const normalizedReading = { ...reading };
      
      // Handle case-insensitive parameter names
      const paramMap = {
        'ph': 'pH',
        'temp': 'temperature',
        'sal': 'salinity',
        'turb': 'turbidity'
      };
      
      // Normalize all parameter names to match our expected format
      Object.keys(reading).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (paramMap[lowerKey] && key !== paramMap[lowerKey]) {
          normalizedReading[paramMap[lowerKey]] = reading[key];
          delete normalizedReading[key];
        }
      });
      
      // Debug: Log pH value for first few readings
      if (index < 3) {
        console.log(`Reading ${index} - pH:`, normalizedReading.pH, 'keys:', Object.keys(normalizedReading));
      }
      
      const date = new Date(normalizedReading.datetime);
      if (isNaN(date.getTime())) {
        console.log('Invalid date in reading:', normalizedReading);
        return;
      }
      
      const timeKey = formatDateKey(date, timeRange);
      
      if (!groups[timeKey]) {
        groups[timeKey] = {
          pH: [],
          temperature: [],
          salinity: [],
          turbidity: [],
          count: 0
        };
      }
      
      // Add parameter values to their respective arrays using normalized reading
      ['pH', 'temperature', 'salinity', 'turbidity'].forEach(param => {
        const value = normalizedReading[param];
        const isValid = typeof value === 'number' && !isNaN(value);
        
        if (isValid) {
          groups[timeKey][param].push(value);
          
          // Log the first few values being added to each group
          if (index < 3) {
            console.log(`Adding to ${timeKey}.${param}:`, {
              value: value,
              type: typeof value,
              isFinite: Number.isFinite(value),
              sourceValue: reading[param] // Original value before normalization
            });
          }
        } else if (index < 3) {
          console.log(`Skipping ${param} (invalid value):`, {
            value: value,
            type: typeof value,
            inReading: param in normalizedReading,
            originalValue: reading[param],
            originalKeys: Object.keys(reading)
          });
        }
      });
      
      groups[timeKey].count++;
      
    } catch (error) {
      console.error('Error processing reading:', error, reading);
    }
  });
  
  console.log('Groups after processing:', Object.keys(groups).length);
  
  // Log the final groups structure
  console.log('Final groups structure:');
  Object.entries(groups).forEach(([timeKey, groupData]) => {
    console.log(`Group ${timeKey}:`, {
      count: groupData.count,
      pH: {
        count: groupData.pH.length,
        firstFew: groupData.pH.slice(0, 3),
        hasNaN: groupData.pH.some(isNaN)
      },
      temperature: {
        count: groupData.temperature.length,
        firstFew: groupData.temperature.slice(0, 3)
      },
      salinity: {
        count: groupData.salinity.length,
        firstFew: groupData.salinity.slice(0, 3)
      },
      turbidity: {
        count: groupData.turbidity.length,
        firstFew: groupData.turbidity.slice(0, 3)
      }
    });
  });

  // Convert groups to array and sort by timestamp
  const sortedGroups = Object.entries(groups)
    .map(([key, data]) => ({
      key,
      ...data,
      date: new Date(data.timestamp)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  console.log('Sorted groups:', sortedGroups.length);
  
  // Prepare the result object with aggregated data
  const result = {
    labels: [],
    datasets: {
      pH: [],
      temperature: [],
      salinity: [],
      turbidity: []
    }
  };
  
  // Process each time group
  sortedGroups.forEach(group => {
    // Add the formatted time key as label
    result.labels.push(group.key);
    
    // Calculate average for each parameter and add to datasets
    const addAverage = (param) => {
      const values = group[param].filter(v => !isNaN(v));
      const avg = values.length > 0 
        ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
        : 0;
      result.datasets[param].push(avg);
    };
    
    addAverage('pH');
    addAverage('temperature');
    addAverage('salinity');
    addAverage('turbidity');
  });
  
  console.log('Final result labels:', result.labels);
  console.log('Final result datasets:', {
    pH: result.datasets.pH.length,
    temperature: result.datasets.temperature.length,
    salinity: result.datasets.salinity.length,
    turbidity: result.datasets.turbidity.length
  });
  
  return result;
};

const formatDateKey = (date, timeRange) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  switch(timeRange.toLowerCase()) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly': {
      const firstDay = new Date(d);
      firstDay.setDate(d.getDate() - d.getDay());
      const weekYear = firstDay.getFullYear();
      const weekMonth = String(firstDay.getMonth() + 1).padStart(2, '0');
      const weekDay = String(firstDay.getDate()).padStart(2, '0');
      return `Week of ${weekYear}-${weekMonth}-${weekDay}`;
    }
    case 'yearly':
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
  const paramThresholds = thresholds[parameter] || thresholds[parameter.toLowerCase()];
  
  if (!paramThresholds) {
    console.warn(`No thresholds found for parameter: ${parameter}. Available parameters:`, Object.keys(thresholds));
    return {
      status: 'unknown',
      message: 'No thresholds defined for this parameter'
    };
  }

  const { min, max } = paramThresholds;
  
  if (value < min * 0.9 || value > max * 1.1) {
    return {
      status: 'critical',
      message: `${parameter} is critically ${value < min ? 'low' : 'high'}`
    };
  } else if (value < min * 0.95 || value > max * 1.05) {
    return {
      status: 'warning',
      message: `${parameter} is ${value < min ? 'low' : 'high'}`
    };
  }
  
  return {
    status: 'normal',
    message: `${parameter} is within normal range`
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
      direction: 'stable',
      message: 'Insufficient data for trend analysis'
    };
  }

  const firstValid = values.findIndex(v => v !== null && v !== undefined);
  const lastValid = values.length - 1 - [...values].reverse()
    .findIndex(v => v !== null && v !== undefined);
  
  if (firstValid === -1 || lastValid === -1) {
    return {
      change: 0,
      direction: 'stable',
      message: 'No valid data points for trend analysis'
    };
  }

  const startValue = values[firstValid];
  const endValue = values[lastValid];
  const change = ((endValue - startValue) / startValue) * 100;
  
  let direction = 'stable';
  if (Math.abs(change) < 5) {
    direction = 'stable';
  } else if (change > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  return {
    change: parseFloat(change.toFixed(2)),
    direction,
    message: `${Math.abs(change).toFixed(2)}% ${direction} over the period`
  };
};

/**
 * Generates a comprehensive water quality report
 * @param {Array} readings - Array of sensor readings
 * @param {string} timeRange - Time range for the report
 * @returns {Object} Complete report with analysis and recommendations
 */
export const generateWaterQualityReport = (readings, timeRange = 'weekly') => {
  console.log('Generating water quality report with time range:', timeRange);
  console.log('Input readings count:', readings?.length || 0);
  
  if (!readings || !Array.isArray(readings) || readings.length === 0) {
    console.log('No valid readings provided for report generation');
    return {
      status: 'error',
      message: 'No data available for the selected time period',
      parameters: {},
      overallStatus: 'unknown',
      recommendations: [],
      generatedAt: new Date().toISOString()
    };
  }

  // Filter out invalid readings
  const validReadings = readings.filter(r => r && r.datetime);
  
  // Log first few readings to check pH values
  console.log('First 3 readings with pH values:');
  validReadings.slice(0, 3).forEach((reading, i) => {
    console.log(`Reading ${i + 1}:`, {
      datetime: reading.datetime,
      pH: reading.pH,
      ph: reading.ph, // Check for lowercase 'ph'
      allKeys: Object.keys(reading),
      hasPH: 'pH' in reading,
      has_ph: 'ph' in reading
    });
  });
  
  if (validReadings.length === 0) {
    console.log('No valid readings with datetime found');
    return {
      status: 'error',
      message: 'No valid data points found in the selected time period',
      parameters: {},
      overallStatus: 'unknown',
      recommendations: [],
      generatedAt: new Date().toISOString()
    };
  }

  console.log(`Processing ${validReadings.length} valid readings`);
  
  // Aggregate data for the time period
  console.log('Starting data aggregation...');
  const aggregatedData = aggregateData(validReadings, timeRange);
  
  // Log the first few aggregated data points
  if (aggregatedData?.labels?.length > 0) {
    console.log('First 3 aggregated data points:');
    const paramKeys = Object.keys(aggregatedData.datasets || {});
    paramKeys.forEach(param => {
      console.log(`Parameter '${param}':`, {
        values: aggregatedData.datasets[param]?.slice(0, 3) || [],
        count: aggregatedData.datasets[param]?.length || 0,
        hasNaN: aggregatedData.datasets[param]?.some(isNaN) || false
      });
    });
  }
  
  // Check if we have any data after aggregation
  if (!aggregatedData || !aggregatedData.labels || aggregatedData.labels.length === 0) {
    console.log('No data after aggregation');
    return {
      status: 'error',
      message: 'No data available after aggregation',
      parameters: {},
      overallStatus: 'unknown',
      recommendations: [],
      generatedAt: new Date().toISOString()
    };
  }
  
  console.log(`Generated ${aggregatedData.labels.length} data points for report`);
  
  // Analyze each parameter
  const parameters = ['pH', 'temperature', 'salinity', 'turbidity'].reduce((acc, param) => {
    // Handle case-insensitive parameter access
    const paramLower = param.toLowerCase();
    const paramKey = Object.keys(aggregatedData.datasets).find(
      key => key.toLowerCase() === paramLower
    ) || paramLower; // Fallback to lowercase if not found
    
    const displayName = param; // Keep original for display
    
    // Debug: Log all available dataset keys and their types
    console.log('Available dataset keys:', Object.entries(aggregatedData.datasets).map(([key, values]) => ({
      key,
      type: Array.isArray(values) ? 'array' : typeof values,
      length: Array.isArray(values) ? values.length : 'N/A'
    })));
    
    // Get values with case-insensitive access
    const values = Array.isArray(aggregatedData.datasets[paramKey]) 
      ? aggregatedData.datasets[paramKey] 
      : [];
    
    // Filter out invalid values
    const validValues = values
      .map(v => {
        const num = parseFloat(v);
        return isNaN(num) ? null : num;
      })
      .filter(v => v !== null);
    
    console.log(`Processing ${displayName} (key: ${paramKey}):`, {
      values: validValues,
      valuesLength: validValues.length,
      firstFew: validValues.slice(0, 3),
      hasNaN: validValues.some(isNaN),
      hasNull: validValues.some(v => v === null || v === undefined)
    });
    
    // Log detailed info about the first few values
    if (validValues.length > 0) {
      console.log(`Detailed values for ${displayName}:`, validValues.slice(0, 5).map((v, i) => ({
        index: i,
        value: v,
        type: typeof v,
        isNumber: typeof v === 'number',
        isFinite: Number.isFinite(v),
        isNaN: isNaN(v)
      })));
    }
    
    const avgValue = validValues.length > 0 
      ? parseFloat((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2))
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
        message: trend.message
      },
      chartData: {
        labels: aggregatedData.labels,
        values: values
      }
    };
    
    return acc;
  }, {});

  // Determine overall status
  const statuses = Object.values(parameters).map(p => p.status);
  let overallStatus = 'good';
  if (statuses.includes('critical')) {
    overallStatus = 'critical';
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
  }

  // Generate recommendations
  const recommendations = [];
  
  if (parameters.pH.status === 'critical') {
    recommendations.push(parameters.pH.average < 6.5 
      ? 'Add pH buffer to increase pH level' 
     : 'Add fresh water or use pH reducer to lower pH level');
  }
  
  if (parameters.temperature.status === 'critical') {
    recommendations.push(parameters.temperature.average < 26
      ? 'Consider using a water heater to raise temperature'
      : 'Add shade or increase aeration to cool the water');
  }
  
  if (parameters.salinity.status === 'critical') {
    recommendations.push(parameters.salinity.average < 0
      ? 'Add marine salt mix to increase salinity'
      : 'Dilute with fresh water to reduce salinity');
  }
  
  if (parameters.turbidity.status === 'critical') {
    recommendations.push('Improve filtration and reduce feeding to lower turbidity');
  }
  
  // Add trend-based recommendations
  if (parameters.pH.trend.direction === 'increasing' && Math.abs(parameters.pH.trend.change) > 10) {
    recommendations.push('Monitor pH closely as it is rising significantly');
  }
  
  if (parameters.temperature.trend.direction === 'increasing' && parameters.temperature.average > 28) {
    recommendations.push('Consider cooling measures as temperature is trending up');
  }

  // Debug log the final parameters
  console.log('Final parameters before returning report:', {
    pH: parameters.pH,
    temperature: parameters.temperature,
    salinity: parameters.salinity,
    turbidity: parameters.turbidity
  });

  return {
    status: 'success',
    timeRange,
    parameters,
    overallStatus,
    recommendations: recommendations.length > 0 
      ? [...new Set(recommendations)] // Remove duplicates
      : ['All parameters are within normal ranges. Maintain current conditions.'],
    generatedAt: new Date().toISOString()
  };
};

/**
 * Prepares data for react-native-chart-kit
 * @param {Object} report - The report object from generateWaterQualityReport
 * @param {string} parameter - Parameter to get chart data for
 * @returns {Object} Formatted data for react-native-chart-kit
 */
export const prepareChartData = (report, parameter) => {
  if (!report || !report.parameters || !report.parameters[parameter]) {
    return {
      labels: [],
      datasets: [{ data: [] }],
      legend: []
    };
  }

  const paramData = report.parameters[parameter];
  
  return {
    labels: paramData.chartData.labels,
    datasets: [{
      data: paramData.chartData.values,
      color: (opacity = 1) => {
        switch(paramData.status) {
          case 'critical': return `rgba(220, 53, 69, ${opacity})`; // Red
          case 'warning': return `rgba(255, 193, 7, ${opacity})`; // Yellow
          default: return `rgba(40, 167, 69, ${opacity})`; // Green
        }
      },
      strokeWidth: 2
    }],
    legend: [`${parameter} (${paramData.average} avg)`]
  };
};
