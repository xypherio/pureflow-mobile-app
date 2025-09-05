import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db as firestore } from './firebase/config';

class HistoricalDataService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    console.log('🔧 HistoricalDataService initialized with cache expiry:', this.cacheExpiry, 'ms');
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
      cacheKey,
      cacheSize: this.cache.size
    });
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;
      console.log('📦 Cache hit:', {
        cacheKey,
        cacheAge: `${cacheAge}ms`,
        cacheExpiry: `${this.cacheExpiry}ms`,
        isExpired: cacheAge >= this.cacheExpiry,
        dataCount: cached.data.length
      });
      
      if (cacheAge < this.cacheExpiry) {
        console.log('✅ Using cached data for current day');
        return cached.data;
      } else {
        console.log('⏰ Cache expired, fetching fresh data');
      }
    } else {
      console.log('❌ Cache miss for key:', cacheKey);
    }

    try {
      console.log('🔄 Executing Firestore query for current day data...');
      console.log('📍 Collection: datm_data');
      console.log('🔍 Query filters:', {
        datetime: `>= ${today.toISOString()} AND < ${tomorrow.toISOString()}`,
        orderBy: 'datetime desc'
      });

      const q = query(
        collection(firestore, 'datm_data'),
        where('datetime', '>=', today),
        where('datetime', '<', tomorrow),
        orderBy('datetime', 'desc')
      );

      console.log('⏱️ Starting Firestore query execution...');
      const startTime = Date.now();
      
      const querySnapshot = await getDocs(q);
      const queryTime = Date.now() - startTime;
      
      console.log('✅ Firestore query completed:', {
        queryTime: `${queryTime}ms`,
        totalDocs: querySnapshot.size,
        empty: querySnapshot.empty
      });

      if (querySnapshot.empty) {
        console.warn('⚠️ No documents found for current day');
        return [];
      }

      const data = [];
      let processedCount = 0;
      
      // Log all field names from the first document
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0].data();
        console.log('📋 Document fields in Firestore:', Object.keys(firstDoc));
      }
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const processedDoc = {
          id: doc.id,
          ...docData,
          datetime: docData.datetime.toDate ? docData.datetime.toDate() : docData.datetime
        };
        
        data.push(processedDoc);
        processedCount++;
        
        // Log first few documents for debugging
        if (processedCount <= 3) {
          console.log(`📄 Document ${processedCount}:`, {
            id: doc.id,
            datetime: processedDoc.datetime,
            pH: docData.pH,
            ph: docData.ph, // Check for lowercase 'ph' as well
            temperature: docData.temperature,
            turbidity: docData.turbidity,
            salinity: docData.salinity
          });
        }
      });

      console.log('📊 Data processing completed:', {
        totalProcessed: processedCount,
        sampleData: data.slice(0, 2).map(d => ({
          datetime: d.datetime,
          pH: d.pH,
          temperature: d.temperature,
          turbidity: d.turbidity,
          salinity: d.salinity
        }))
      });

      // Sort by datetime ascending for chart display
      data.sort((a, b) => a.datetime - b.datetime);
      console.log('🔄 Data sorted by datetime (ascending)');

      // Cache the data
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      console.log('💾 Data cached successfully:', {
        cacheKey,
        cacheSize: this.cache.size,
        dataCount: data.length
      });

      return data;
    } catch (error) {
      console.error('❌ Error fetching current day data:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Return cached data if available, even if expired
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        console.log('⚠️ Returning expired cached data due to error:', {
          cacheKey,
          cacheAge: `${Date.now() - cached.timestamp}ms`,
          dataCount: cached.data.length
        });
        return cached.data;
      }
      
      console.log('❌ No cached data available, returning empty array');
      return [];
    }
  }

  // Get aggregated data for reports tab
  async getAggregatedData(timeFilter, startDate, endDate, useCache = true) {
    // Create cache key based on the filter and date range
    const cacheKey = `aggregated_${timeFilter}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    
    console.log('📊 Fetching aggregated data:', {
      timeFilter,
      startDate: startDate.toISOString(),
      startLocal: startDate.toString(),
      endDate: endDate.toISOString(),
      endLocal: endDate.toString(),
      cacheKey,
      useCache,
      cacheSize: this.cache.size
    });
    
    // Check cache first if useCache is true
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;
      const isExpired = cacheAge >= this.cacheExpiry;
      
      console.log('📦 Cache check for aggregated data:', {
        cacheKey,
        cacheAge: `${cacheAge}ms`,
        cacheExpiry: `${this.cacheExpiry}ms`,
        isExpired,
        dataCount: cached.data?.length || 0
      });
      
      if (!isExpired) {
        console.log('✅ Using cached aggregated data');
        return [...cached.data]; // Return a copy to prevent mutation
      }
      
      console.log('⏰ Aggregated data cache expired, fetching fresh data');
    } else if (useCache) {
      console.log('❌ Cache miss for aggregated data key:', cacheKey);
    }

    try {
      console.log('🔄 [getAggregatedData] Executing Firestore query with timezone handling...');
      console.log('📍 Collection: datm_data');
      
      // Ensure we're working with Date objects
      const queryStartDate = new Date(startDate);
      const queryEndDate = new Date(endDate);
      
      // Log the exact query parameters being used
      console.log('🔍 [getAggregatedData] Query parameters:', {
        timeFilter,
        startDate: {
          iso: queryStartDate.toISOString(),
          local: queryStartDate.toString(),
          timestamp: queryStartDate.getTime()
        },
        endDate: {
          iso: queryEndDate.toISOString(),
          local: queryEndDate.toString(),
          timestamp: queryEndDate.getTime()
        },
        timezoneOffset: new Date().getTimezoneOffset()
      });

      // Create the query with proper date range filtering
      const q = query(
        collection(firestore, 'datm_data'),
        where('datetime', '>=', queryStartDate),
        where('datetime', '<=', queryEndDate),
        orderBy('datetime', 'asc')
      );

      console.log('⏱️ [getAggregatedData] Starting query execution...');
      const startTime = Date.now();
      
      const querySnapshot = await getDocs(q);
      const queryTime = Date.now() - startTime;
      
      console.log('✅ [getAggregatedData] Query completed:', {
        queryTime: `${queryTime}ms`,
        totalDocs: querySnapshot.size,
        empty: querySnapshot.empty
      });

      if (querySnapshot.empty) {
        console.warn('⚠️ [getAggregatedData] No documents found in query results');
        return [];
      }

      const rawData = [];
      let invalidDocs = 0;
      
      // Process each document in the query results
      querySnapshot.forEach((doc) => {
        try {
          const docData = doc.data();
          
          // Skip if no data or no datetime
          if (!docData || !docData.datetime) {
            invalidDocs++;
            return;
          }
          
          // Handle Firestore timestamps
          const timestamp = docData.datetime;
          const datetime = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
          
          // Validate datetime
          if (isNaN(datetime.getTime())) {
            console.warn('⚠️ [getAggregatedData] Invalid datetime in document:', {
              docId: doc.id,
              timestamp: timestamp,
              parsed: datetime.toString()
            });
            invalidDocs++;
            return;
          }
          
          // Prepare the data point
          const dataPoint = {
            id: doc.id,
            ...docData,
            datetime: datetime
          };
          
          // Validate required fields
          const requiredFields = ['pH', 'temperature', 'turbidity', 'salinity'];
          const isValid = requiredFields.every(field => {
            const value = dataPoint[field];
            return value !== null && value !== undefined && !isNaN(value);
          });
          
          if (!isValid) {
            console.warn('⚠️ [getAggregatedData] Missing or invalid fields in document:', {
              docId: doc.id,
              datetime: datetime.toISOString(),
              ...dataPoint
            });
            invalidDocs++;
            return;
          }
          
          // Add to results
          rawData.push(dataPoint);
          
          // Log first few valid documents for debugging
          if (rawData.length <= 3) {
            console.log(`📄 [getAggregatedData] Sample document ${rawData.length}:`, {
              id: doc.id,
              datetime: datetime.toISOString(),
              localTime: datetime.toString(),
              pH: docData.pH,
              temperature: docData.temperature,
              turbidity: docData.turbidity,
              salinity: docData.salinity
            });
          }
        } catch (error) {
          console.error('❌ Error processing document:', {
            docId: doc.id,
            error: error.message,
            data: doc.data()
          });
        }
      });

      // Log data collection summary
      console.log('📊 [getAggregatedData] Data collection summary:', {
        totalDocs: querySnapshot.size,
        validDocs: rawData.length,
        invalidDocs: invalidDocs,
        validityRate: `${Math.round((rawData.length / (rawData.length + invalidDocs)) * 100 || 0)}%`,
        timeRange: rawData.length > 0 ? {
          start: rawData[0]?.datetime?.toISOString(),
          end: rawData[rawData.length - 1]?.datetime?.toISOString(),
          duration: rawData.length > 1 
            ? `${(rawData[rawData.length - 1].datetime - rawData[0].datetime) / (1000 * 60 * 60)} hours`
            : 'N/A'
        } : 'No valid data'
      });

      // If no valid data found, return empty array
      if (rawData.length === 0) {
        console.warn('⚠️ [getAggregatedData] No valid data points found after processing');
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
        this.cache.set(cacheKey, {
          data: [...aggregatedData], // Store a copy to prevent mutation
          timestamp: Date.now()
        });
        
        console.log('💾 [getAggregatedData] Data cached successfully:', {
          cacheKey,
          cacheSize: this.cache.size,
          dataPoints: aggregatedData.length,
          cacheExpiry: new Date(Date.now() + this.cacheExpiry).toISOString()
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