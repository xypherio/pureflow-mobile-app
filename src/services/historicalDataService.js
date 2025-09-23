import { fetchAllDocuments } from './firebase/firestore';
import { DataProcessor } from './processing/DataProcessor';

class HistoricalDataService {
  constructor() {
    this.dataCacheService = null;
    this.dataProcessor = new DataProcessor();
    this.initializeDataProcessingPipeline();
    console.log('🔧 HistoricalDataService constructed with DataProcessor');
  }

  initializeDataProcessingPipeline() {
    // Add basic validation rules
    this.dataProcessor.addValidationRule('pH', value => value >= 0 && value <= 14);
    this.dataProcessor.addValidationRule('temperature', value => value >= -10 && value <= 50);
    this.dataProcessor.addValidationRule('turbidity', value => value >= 0);
    this.dataProcessor.addValidationRule('salinity', value => value >= 0);

    // Add transformation rules
    this.dataProcessor.addTransformationRule('pH', value => parseFloat(value.toFixed(2)));
    this.dataProcessor.addTransformationRule('temperature', value => parseFloat(value.toFixed(1)));
    this.dataProcessor.addTransformationRule('turbidity', value => Math.round(value));
    this.dataProcessor.addTransformationRule('salinity', value => Math.round(value * 100) / 100);
  }

  postInitialize(dataCacheService) {
    this.dataCacheService = dataCacheService;
    console.log('✅ HistoricalDataService post-initialized with DataCacheService');
  }

  // Get data for home tab - all readings for current day
  async getCurrentDayData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const cacheKey = `currentDay_${today.toISOString().split('T')[0]}`;

    console.log('📅 Fetching current day data:', {
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString(),
      cacheKey
    });

    // Check cache first
    const cachedData = await this.dataCacheService.getCachedSensorData(cacheKey);
    if (cachedData) {
      console.log('✅ Using cached data for current day');
      return cachedData;
    }

    try {
      // Fetch raw data from Firestore
      const rawData = await fetchAllDocuments('datm_data', {
        filters: [
          { field: 'datetime', operator: '>=', value: today },
          { field: 'datetime', operator: '<', value: tomorrow }
        ],
        orderBy: 'datetime',
        orderDirection: 'desc'
      });

      console.log(`✅ Fetched ${rawData.length} raw records from Firestore`);

      // Process each data point through the DataProcessor pipeline
      const processedData = [];
      const errors = [];

      for (const entry of rawData) {
        try {
          // Process the data through our pipeline
          const result = await this.dataProcessor.processData(entry);
          
          if (result.isValid) {
            processedData.push(result.data);
          } else {
            errors.push({
              entry,
              errors: result.errors
            });
          }
        } catch (error) {
          console.error('Error processing data entry:', error, entry);
          errors.push({
            entry,
            error: error.message
          });
        }
      }

      if (errors.length > 0) {
        console.warn(`⚠️ Processed with ${errors.length} errors out of ${rawData.length} records`);
      }

      // Sort by datetime ascending for chart display
      processedData.sort((a, b) => a.datetime - b.datetime);
      console.log(`🔄 Processed ${processedData.length} valid records (${errors.length} errors)`);

      // Cache the processed data
      await this.dataCacheService.cacheSensorData(cacheKey, processedData);
      
      console.log('💾 Processed data cached successfully:', {
        cacheKey,
        dataCount: processedData.length
      });

      return processedData;
    } catch (error) {
      console.error('❌ Error fetching current day data:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Return cached data if available, even if expired
      const cachedData = await this.dataCacheService.getCachedSensorData(cacheKey);
      if (cachedData) {
        console.log('⚠️ Returning expired cached data due to error');
        return cachedData;
      }
      
      console.log('❌ No cached data available, returning empty array');
      return [];
    }
  }

  // Get aggregated data for reports tab
  async getAggregatedData(timeFilter, startDate, endDate, useCache = true) {
    // Create cache key based on the filter and date range
    const dateRange = { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };

    console.log('📊 Fetching aggregated data:', {
      timeFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      useCache
    });

    // Check cache first if useCache is true
    if (useCache) {
      const cachedData = await this.dataCacheService.getCachedAggregatedData(timeFilter, dateRange);
      if (cachedData) {
        console.log('✅ Using cached aggregated data');
        return cachedData;
      }
      console.log('❌ Cache miss for aggregated data');
    }

    try {
      const rawData = await fetchAllDocuments('datm_data', {
        startAfter: startDate,
        endBefore: endDate,
        orderByField: 'datetime',
        orderDirection: 'asc'
      });

      // Log data collection summary
      console.log('📊 [getAggregatedData] Data collection summary:', {
        totalDocs: rawData.length,
        empty: rawData.length === 0
      });

      if (rawData.length === 0) {
        console.warn('⚠️ [getAggregatedData] No documents found in query results');
        return [];
      }


      // Aggregate data based on time filter
      console.log(`🔄 [getAggregatedData] Starting data aggregation for ${timeFilter} filter...`);
      const aggregationStartTime = Date.now();
      
      const aggregatedData = this.aggregateData(rawData, timeFilter);
      
      const aggregationTime = Date.now() - aggregationStartTime;
      
      console.log('✅ [getAggregatedData] Data aggregation completed:', {
        timeTaken: `${aggregationTime}ms`,
        originalCount: rawData.length,
        aggregatedCount: aggregatedData.length,
        reduction: `${Math.round(((rawData.length - aggregatedData.length) / rawData.length) * 100)}%`,
        timeRange: aggregatedData.length > 0 ? {
          start: aggregatedData[0]?.datetime?.toISOString(),
          end: aggregatedData[aggregatedData.length - 1]?.datetime?.toISOString(),
          points: aggregatedData.length
        } : 'No data',
        dataSample: aggregatedData.length > 0 ? {
          first: {
            datetime: aggregatedData[0]?.datetime?.toISOString(),
            pH: aggregatedData[0]?.pH,
            temperature: aggregatedData[0]?.temperature,
            turbidity: aggregatedData[0]?.turbidity,
            salinity: aggregatedData[0]?.salinity
          },
          last: aggregatedData.length > 1 ? {
            datetime: aggregatedData[aggregatedData.length - 1]?.datetime?.toISOString(),
            pH: aggregatedData[aggregatedData.length - 1]?.pH,
            temperature: aggregatedData[aggregatedData.length - 1]?.temperature,
            turbidity: aggregatedData[aggregatedData.length - 1]?.turbidity,
            salinity: aggregatedData[aggregatedData.length - 1]?.salinity
          } : 'Single data point'
        } : 'No data available'
      });

      // Cache the results if we have data
      if (aggregatedData.length > 0) {
        await this.dataCacheService.cacheAggregatedData(timeFilter, dateRange, aggregatedData);
        console.log('💾 [getAggregatedData] Data cached successfully:', {
          dataPoints: aggregatedData.length
        });
      } else {
        console.log('ℹ️ [getAggregatedData] Not caching empty dataset');
      }

      return aggregatedData;
    } catch (error) {
      // Prepare error details for logging
      const errorDetails = {
        error: error.message,
        code: error.code,
        name: error.name,
        timeFilter,
        cacheKey,
        timestamp: new Date().toISOString(),
        timezoneOffset: new Date().getTimezoneOffset(),
        queryParams: {
          startDate: startDate?.toISOString(),
          startLocal: startDate?.toString(),
          endDate: endDate?.toISOString(),
          endLocal: endDate?.toString()
        }
      };
      
      // Include stack trace in development
      if (__DEV__) {
        errorDetails.stack = error.stack;
      }
      
      console.log('❌ No cached aggregated data available, returning empty array');
      return [];
    }
  }

  /**
   * Aggregate data based on time filter with proper timezone handling
   * @param {Array} rawData - Array of raw data points
   * @param {string} timeFilter - Time filter ('daily', 'weekly', 'monthly', 'annually')
   * @returns {Array} Aggregated data
   */
  aggregateData(rawData, timeFilter) {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      console.warn('⚠️ [aggregateData] No data to aggregate');
      return [];
    }

    // Log input data summary
    console.log('🔄 [aggregateData] Starting aggregation:', {
      timeFilter,
      dataPoints: rawData.length,
      timeRange: {
        start: rawData[0]?.datetime?.toISOString(),
        end: rawData[rawData.length - 1]?.datetime?.toISOString(),
        duration: rawData.length > 1 
          ? `${(rawData[rawData.length - 1].datetime - rawData[0].datetime) / (1000 * 60 * 60)} hours`
          : 'N/A'
      },
      sampleData: rawData.length > 0 ? {
        first: {
          datetime: rawData[0].datetime?.toISOString(),
          pH: rawData[0].pH,
          temperature: rawData[0].temperature
        },
        last: rawData.length > 1 ? {
          datetime: rawData[rawData.length - 1].datetime?.toISOString(),
          pH: rawData[rawData.length - 1].pH,
          temperature: rawData[rawData.length - 1].temperature
        } : 'Single data point'
      } : 'No data'
    });

    // Sort data by datetime just to be safe
    const sortedData = [...rawData].sort((a, b) => a.datetime - b.datetime);
    
    let aggregatedData;
    try {
      switch (timeFilter) {
        case 'daily':
          aggregatedData = this.aggregateBy2Hour(sortedData);
          break;
        case 'weekly':
        case 'monthly':
          aggregatedData = this.aggregateByDay(sortedData);
          break;
        case 'annually':
          aggregatedData = this.aggregateByMonth(sortedData);
          break;
        default:
          console.warn(`⚠️ [aggregateData] Unknown time filter: ${timeFilter}, returning raw data`);
          aggregatedData = sortedData;
      }
      
      // Validate aggregated data
      if (!Array.isArray(aggregatedData)) {
        console.error('❌ [aggregateData] Aggregation returned non-array result, returning empty array');
        return [];
      }
      
      // Ensure all data points have required fields
      aggregatedData = aggregatedData.filter(point => 
        point && 
        point.datetime instanceof Date && 
        !isNaN(point.datetime.getTime())
      );
      
      return aggregatedData;
      
    } catch (error) {
      console.error('❌ [aggregateData] Error during aggregation:', {
        error: error.message,
        stack: error.stack,
        timeFilter,
        inputDataLength: rawData.length
      });
      
      // Return empty array on error to prevent crashes
      return [];
    }

  }

  /**
   * Aggregate data into 2-hour intervals with proper timezone handling
   * @param {Array} data - Array of data points to aggregate
   * @returns {Array} Aggregated data in 2-hour intervals
   */
  aggregateBy2Hour(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ [aggregateBy2Hour] No data to process');
      return [];
    }

    console.log('⏰ [aggregateBy2Hour] Starting 2-hour aggregation for', data.length, 'data points');
    
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    let skippedCount = 0;
    
    // Log data sample for debugging
    if (data.length > 0) {
      console.log('📋 [aggregateBy2Hour] Data sample (first 2 items):', {
        firstItem: {
          datetime: data[0].datetime?.toISOString(),
          ...parameters.reduce((acc, param) => ({
            ...acc,
            [param]: data[0][param] ?? data[0][param.toLowerCase()] ?? 'missing'
          }), {})
        },
        fieldNames: Object.keys(data[0])
      });
    }

    data.forEach((reading, index) => {
      // Skip invalid readings
      if (!reading || !reading.datetime || !(reading.datetime instanceof Date) || isNaN(reading.datetime.getTime())) {
        skippedCount++;
        if (skippedCount <= 5) { // Only log first few skips to avoid flooding
          console.warn('⚠️ [aggregateBy2Hour] Skipping invalid reading:', {
            index,
            datetime: reading?.datetime?.toString(),
            hasDatetime: !!reading?.datetime,
            isDate: reading?.datetime instanceof Date,
            isValid: !isNaN(reading?.datetime?.getTime())
          });
        }
        return;
      }

      // Create date in local timezone
      const localDate = new Date(reading.datetime);
      
      // Handle timezone offset to ensure consistent local time
      const tzOffset = localDate.getTimezoneOffset() * 60000; // in milliseconds
      const localTime = new Date(localDate - tzOffset);
      
      // Calculate 2-hour block in local time
      const localHour = localTime.getHours();
      const twoHourBlock = Math.floor(localHour / 2) * 2;
      
      // Create a consistent key in local time
      const key = localTime.toISOString().split('T')[0] + 
                 `T${String(twoHourBlock).padStart(2, '0')}:00:00`;

      if (!aggregated[key]) {
        aggregated[key] = {
          datetime: new Date(key),
          count: 0,
          pH: { sum: 0, count: 0 },
          temperature: { sum: 0, count: 0 },
          turbidity: { sum: 0, count: 0 },
          salinity: { sum: 0, count: 0 }
        };
      }

      // Process each parameter with case-insensitive access and validation
      parameters.forEach(param => {
        try {
          // Handle case-insensitive parameter access and check for null/undefined
          const paramLower = param.toLowerCase();
          const value = reading[param] ?? reading[paramLower] ?? null;
          
          // Skip if value is null, undefined, or not a number
          if (value === null || value === undefined || 
              (typeof value !== 'number' && isNaN(parseFloat(value)))) {
            return; // Skip to next parameter
          }
          
          // Parse the value to number
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          
          // Only process valid numbers
          if (!isNaN(numValue)) {
            // Initialize if not exists (should be done above, but just to be safe)
            if (!aggregated[key][param]) {
              aggregated[key][param] = { sum: 0, count: 0 };
            }
            
            // Add to aggregation
            aggregated[key][param].sum += numValue;
            aggregated[key][param].count += 1;
            
            // Debug logging for first few values of each parameter
            if (index < 3) {
              console.log(`[aggregateBy2Hour] Processed ${param}:`, {
                originalValue: value,
                normalizedValue: numValue,
                readingDatetime: reading.datetime?.toISOString(),
                blockKey: key,
                currentSum: aggregated[key][param].sum,
                currentCount: aggregated[key][param].count
              });
            }
          }
        } catch (error) {
          console.error(`❌ [aggregateBy2Hour] Error processing parameter '${param}':`, {
            error: error.message,
            reading: {
              id: reading.id,
              datetime: reading.datetime?.toISOString(),
              availableKeys: Object.keys(reading)
            }
          });
        }
      });
      
      aggregated[key].count += 1;
    });

    // Process aggregated data into final result format
    const result = Object.values(aggregated)
      .map(block => {
        // Calculate averages for each parameter
        const processedBlock = {
          datetime: block.datetime,
          _meta: {
            totalReadings: block.count
          }
        };
        
        // Process each parameter
        parameters.forEach(param => {
          const paramData = block[param];
          if (paramData && paramData.count > 0) {
            processedBlock[param] = paramData.sum / paramData.count;
            processedBlock._meta[`${param}_count`] = paramData.count;
          } else {
            processedBlock[param] = null;
            processedBlock._meta[`${param}_count`] = 0;
          }
        });
        
        return processedBlock;
      })
      // Sort by datetime to ensure consistent ordering
      .sort((a, b) => a.datetime - b.datetime);

    // Log aggregation summary
    const summary = {
      originalCount: data.length,
      aggregatedCount: result.length,
      timeBlocks: Object.keys(aggregated).length,
      skippedReadings: skippedCount,
      parameters: parameters.reduce((acc, param) => {
        const paramResults = result.map(r => r[param]);
        const validValues = paramResults.filter(v => v !== null);
        
        acc[param] = {
          total: validValues.length,
          percentage: (validValues.length / result.length * 100).toFixed(1) + '%',
          min: validValues.length > 0 ? Math.min(...validValues) : 'N/A',
          max: validValues.length > 0 ? Math.max(...validValues) : 'N/A',
          avg: validValues.length > 0 
            ? (validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(2) 
            : 'N/A'
        };
        return acc;
      }, {})
    };

    console.log('✅ [aggregateBy2Hour] Aggregation completed:', {
      ...summary,
      firstBlock: result[0] ? {
        datetime: result[0].datetime.toISOString(),
        ...parameters.reduce((acc, p) => ({ ...acc, [p]: result[0][p] }), {})
      } : 'No data',
      lastBlock: result.length > 1 ? {
        datetime: result[result.length - 1].datetime.toISOString(),
        ...parameters.reduce((acc, p) => ({ ...acc, [p]: result[result.length - 1][p] }), {})
      } : 'Single block or no data'
    });

    // Return only the data without _meta in production
    return result.map(({ _meta, ...cleanBlock }) => cleanBlock);
  }

  /**
   * Aggregate data by day with proper timezone handling
   * @param {Array} data - Array of data points to aggregate
   * @returns {Array} Data aggregated by day
   */
  aggregateByDay(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ [aggregateByDay] No data to process');
      return [];
    }

    console.log('📅 [aggregateByDay] Starting daily aggregation for', data.length, 'data points');
    
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    let skippedCount = 0;
    
    // Log data sample for debugging
    if (data.length > 0) {
      console.log('📋 [aggregateByDay] Data sample (first 2 items):', {
        firstItem: {
          datetime: data[0].datetime?.toISOString(),
          ...parameters.reduce((acc, param) => ({
            ...acc,
            [param]: data[0][param] ?? data[0][param.toLowerCase()] ?? 'missing'
          }), {})
        },
        fieldNames: Object.keys(data[0])
      });
    }

    data.forEach((reading, index) => {
      // Skip invalid readings
      if (!reading || !reading.datetime || !(reading.datetime instanceof Date) || isNaN(reading.datetime.getTime())) {
        skippedCount++;
        if (skippedCount <= 5) { // Only log first few skips to avoid flooding
          console.warn('⚠️ [aggregateByDay] Skipping invalid reading:', {
            index,
            datetime: reading?.datetime?.toString(),
            hasDatetime: !!reading?.datetime,
            isDate: reading?.datetime instanceof Date,
            isValid: !isNaN(reading?.datetime?.getTime())
          });
        }
        return;
      }

      // Create date in local timezone
      const localDate = new Date(reading.datetime);
      
      // Handle timezone offset to ensure consistent local time
      const tzOffset = localDate.getTimezoneOffset() * 60000; // in milliseconds
      const localTime = new Date(localDate - tzOffset);
      
      // Create a consistent key in local time (YYYY-MM-DD)
      const key = localTime.toISOString().split('T')[0];
      
      // Initialize the day's data structure if it doesn't exist
      if (!aggregated[key]) {
        // Create date at midnight in local time
        const [year, month, day] = key.split('-').map(Number);
        const localMidnight = new Date(Date.UTC(year, month - 1, day));
        
        aggregated[key] = {
          datetime: localMidnight,
          count: 0,
          pH: { sum: 0, count: 0 },
          temperature: { sum: 0, count: 0 },
          turbidity: { sum: 0, count: 0 },
          salinity: { sum: 0, count: 0 }
        };
      }

      // Process each parameter with case-insensitive access and validation
      parameters.forEach(param => {
        try {
          // Handle case-insensitive parameter access and check for null/undefined
          const paramLower = param.toLowerCase();
          const value = reading[param] ?? reading[paramLower] ?? null;
          
          // Skip if value is null, undefined, or not a number
          if (value === null || value === undefined || 
              (typeof value !== 'number' && isNaN(parseFloat(value)))) {
            return; // Skip to next parameter
          }
          
          // Parse the value to number
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          
          // Only process valid numbers
          if (!isNaN(numValue)) {
            // Add to aggregation
            aggregated[key][param].sum += numValue;
            aggregated[key][param].count += 1;
          }
        } catch (error) {
          console.error(`❌ [aggregateByDay] Error processing parameter '${param}':`, {
            error: error.message,
            reading: {
              id: reading.id,
              datetime: reading.datetime?.toISOString(),
              availableKeys: Object.keys(reading)
            }
          });
        }
      });
      
      aggregated[key].count += 1;
    });

    return Object.values(aggregated).map(block => ({
      datetime: block.datetime,
      pH: block.pH.count > 0 ? block.pH.sum / block.pH.count : null,
      temperature: block.temperature.count > 0 ? block.temperature.sum / block.temperature.count : null,
      turbidity: block.turbidity.count > 0 ? block.turbidity.sum / block.turbidity.count : null,
      salinity: block.salinity.count > 0 ? block.salinity.sum / block.salinity.count : null
    }));
  }

  /**
   * Aggregate data by month with proper timezone handling
   * @param {Array} data - Array of data points to aggregate
   * @returns {Array} Data aggregated by month
   */
  aggregateByMonth(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ [aggregateByMonth] No data to process');
      return [];
    }

    console.log('📅 [aggregateByMonth] Starting monthly aggregation for', data.length, 'data points');
    
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    let skippedCount = 0;
    
    // Log data sample for debugging
    if (data.length > 0) {
      console.log('📋 [aggregateByMonth] Data sample (first item):', {
        datetime: data[0].datetime?.toISOString(),
        ...parameters.reduce((acc, param) => ({
          ...acc,
          [param]: data[0][param] ?? data[0][param.toLowerCase()] ?? 'missing'
        }), {})
      });
    }

    data.forEach((reading, index) => {
      // Skip invalid readings
      if (!reading || !reading.datetime || !(reading.datetime instanceof Date) || isNaN(reading.datetime.getTime())) {
        skippedCount++;
        if (skippedCount <= 5) { // Only log first few skips to avoid flooding
          console.warn('⚠️ [aggregateByMonth] Skipping invalid reading:', {
            index,
            datetime: reading?.datetime?.toString(),
            hasDatetime: !!reading?.datetime,
            isDate: reading?.datetime instanceof Date,
            isValid: !isNaN(reading?.datetime?.getTime())
          });
        }
        return;
      }

      // Create date in local timezone
      const localDate = new Date(reading.datetime);
      
      // Create a consistent key in local time (YYYY-MM)
      const year = localDate.getFullYear();
      const month = localDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      
      // Initialize the month's data structure if it doesn't exist
      if (!aggregated[key]) {
        // Create date at first day of month in local time
        const localFirstDay = new Date(Date.UTC(year, month - 1, 1));
        
        aggregated[key] = {
          datetime: localFirstDay,
          count: 0,
          pH: { sum: 0, count: 0 },
          temperature: { sum: 0, count: 0 },
          turbidity: { sum: 0, count: 0 },
          salinity: { sum: 0, count: 0 }
        };
      }

      // Process each parameter with case-insensitive access and validation
      parameters.forEach(param => {
        try {
          // Handle case-insensitive parameter access and check for null/undefined
          const paramLower = param.toLowerCase();
          const value = reading[param] ?? reading[paramLower] ?? null;
          
          // Skip if value is null, undefined, or not a number
          if (value === null || value === undefined || 
              (typeof value !== 'number' && isNaN(parseFloat(value)))) {
            return; // Skip to next parameter
          }
          
          // Parse the value to number
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          
          // Only process valid numbers
          if (!isNaN(numValue)) {
            // Add to aggregation
            aggregated[key][param].sum += numValue;
            aggregated[key][param].count += 1;
          }
        } catch (error) {
          console.error(`❌ [aggregateByMonth] Error processing parameter '${param}':`, {
            error: error.message,
            reading: {
              id: reading.id,
              datetime: reading.datetime?.toISOString(),
              availableKeys: Object.keys(reading)
            }
          });
        }
      });
      
      aggregated[key].count += 1;
    });

    // Process aggregated data into final result format
    const result = Object.values(aggregated)
      .map(block => {
        // Calculate averages for each parameter
        const processedBlock = {
          datetime: block.datetime,
          _meta: {
            totalReadings: block.count
          }
        };
        
        // Process each parameter
        parameters.forEach(param => {
          const paramData = block[param];
          if (paramData && paramData.count > 0) {
            processedBlock[param] = paramData.sum / paramData.count;
            processedBlock._meta[`${param}_count`] = paramData.count;
          } else {
            processedBlock[param] = null;
            processedBlock._meta[`${param}_count`] = 0;
          }
        });
        
        return processedBlock;
      })
      // Sort by datetime to ensure consistent ordering
      .sort((a, b) => a.datetime - b.datetime);

    // Log aggregation summary
    const summary = {
      originalCount: data.length,
      aggregatedCount: result.length,
      months: Object.keys(aggregated).length,
      skippedReadings: skippedCount,
      parameters: parameters.reduce((acc, param) => {
        const paramResults = result.map(r => r[param]);
        const validValues = paramResults.filter(v => v !== null);
        
        acc[param] = {
          total: validValues.length,
          percentage: result.length > 0 ? (validValues.length / result.length * 100).toFixed(1) + '%' : '0%',
          min: validValues.length > 0 ? Math.min(...validValues) : 'N/A',
          max: validValues.length > 0 ? Math.max(...validValues) : 'N/A',
          avg: validValues.length > 0 
            ? (validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(2) 
            : 'N/A'
        };
        return acc;
      }, {})
    };

    console.log('✅ [aggregateByMonth] Monthly aggregation completed:', {
      ...summary,
      dateRange: result.length > 0 ? {
        start: result[0].datetime.toISOString(),
        end: result[result.length - 1].datetime.toISOString(),
        months: (result[result.length - 1].datetime.getFullYear() - result[0].datetime.getFullYear()) * 12 + 
                (result[result.length - 1].datetime.getMonth() - result[0].datetime.getMonth()) + 1
      } : 'No data',
      firstMonth: result[0] ? {
        month: result[0].datetime.toISOString().slice(0, 7),
        ...parameters.reduce((acc, p) => ({ ...acc, [p]: result[0][p] }), {})
      } : 'No data'
    });

    // Return only the data without _meta in production
    return result.map(({ _meta, ...cleanBlock }) => cleanBlock);
  }

  /**
   * Get date range for reports based on filter with proper timezone handling
   * @param {string} timeFilter - The time filter ('daily', 'weekly', 'monthly', 'annually')
   * @returns {Object} Object containing start and end dates
   */
  getDateRange(timeFilter) {
    console.log('🔄 [getDateRange] Calculating date range for filter:', timeFilter);
    
    // Get current date in local timezone
    const now = new Date();
    
    // Log current timezone info for debugging
    const timezoneOffset = now.getTimezoneOffset();
    console.log('🌐 Timezone information:', {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: `${-timezoneOffset / 60} hours`,
      currentLocalTime: now.toString(),
      currentUTCTime: now.toISOString()
    });
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    
    let startDate, endDate;

    // Helper function to create date in local timezone
    const createLocalDate = (y, m, day, h = 0, min = 0, s = 0, ms = 0) => {
      const dateObj = new Date(y, m, day, h, min, s, ms);
      // Adjust for timezone offset to ensure we're working in local time
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      return new Date(dateObj - tzOffset);
    };

    switch (timeFilter) {
      case 'daily':
        // For daily, get today's data in local timezone
        startDate = createLocalDate(year, month, date, 0, 0, 0, 0);
        endDate = createLocalDate(year, month, date, 23, 59, 59, 999);
        break;
        
      case 'weekly':
        // For weekly, get current week (Monday to Sunday)
        const today = createLocalDate(year, month, date);
        const dayOfWeek = today.getDay();
        // Get the most recent Monday (if today is Sunday, go back 6 days)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysToSubtract);
        
        startDate = createLocalDate(
          monday.getFullYear(), 
          monday.getMonth(), 
          monday.getDate(), 
          0, 0, 0, 0
        );
        
        // End date is Sunday (6 days after Monday)
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        endDate = createLocalDate(
          sunday.getFullYear(),
          sunday.getMonth(),
          sunday.getDate(),
          23, 59, 59, 999
        );
        break;
        
      case 'monthly':
        // For monthly, get current month
        startDate = createLocalDate(year, month, 1, 0, 0, 0, 0);
        // Last day of current month
        const lastDay = new Date(year, month + 1, 0).getDate();
        endDate = createLocalDate(year, month, lastDay, 23, 59, 59, 999);
        break;
        
      case 'annually':
        // For annually, get current year
        startDate = createLocalDate(year, 0, 1, 0, 0, 0, 0);
        endDate = createLocalDate(year, 11, 31, 23, 59, 59, 999);
        break;
        
      default:
        // Default to today
        startDate = createLocalDate(year, month, date, 0, 0, 0, 0);
        endDate = createLocalDate(year, month, date, 23, 59, 59, 999);
    }
    
    // Log the calculated date range
    console.log('📅 Calculated date range:', {
      filter: timeFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startLocal: startDate.toString(),
      endLocal: endDate.toString()
    });

    return { 
      startDate: new Date(startDate), // Ensure we return new instances
      endDate: new Date(endDate)      // to prevent reference issues
    };
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    const beforeSize = this.cache.size;
    let clearedCount = 0;
    
    console.log('🧹 Starting cache cleanup...', {
      beforeSize,
      currentTime: new Date(now).toISOString()
    });

    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > this.cacheExpiry) {
        console.log('🗑️ Clearing expired cache entry:', {
          key,
          age: `${age}ms`,
          expiry: `${this.cacheExpiry}ms`,
          dataCount: value.data.length
        });
        this.cache.delete(key);
        clearedCount++;
      }
    }

    const afterSize = this.cache.size;
    console.log('✅ Cache cleanup completed:', {
      beforeSize,
      afterSize,
      clearedCount,
      remainingEntries: afterSize
    });
  }

  // Clear cache entries for a specific filter
  clearCacheForFilter(filter) {
    let clearedCount = 0;
    const filterPrefix = `aggregated_${filter}_`;
    
    // Create a new iterator to avoid modifying the map during iteration
    const entries = Array.from(this.cache.entries());
    
    for (const [key] of entries) {
      if (key.startsWith(filterPrefix)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} cache entries for filter: ${filter}`);
    }
  }
  
  // Clear all cache
  clearCache() {
    const beforeSize = this.cache.size;
    console.log('🧹 Clearing all cache entries:', { beforeSize });
    
    this.cache.clear();
    
    console.log('✅ All cache cleared:', {
      beforeSize,
      afterSize: this.cache.size
    });
  }
}

export const historicalDataService = new HistoricalDataService();