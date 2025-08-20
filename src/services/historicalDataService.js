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
  async getAggregatedData(timeFilter, startDate, endDate) {
    const cacheKey = `aggregated_${timeFilter}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    
    console.log('📊 Fetching aggregated data:', {
      timeFilter,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      cacheKey,
      cacheSize: this.cache.size
    });
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;
      console.log('📦 Cache hit for aggregated data:', {
        cacheKey,
        cacheAge: `${cacheAge}ms`,
        cacheExpiry: `${this.cacheExpiry}ms`,
        isExpired: cacheAge >= this.cacheExpiry,
        dataCount: cached.data.length
      });
      
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('✅ Using cached aggregated data');
        return cached.data;
      } else {
        console.log('⏰ Aggregated data cache expired, fetching fresh data');
      }
    } else {
      console.log('❌ Cache miss for aggregated data key:', cacheKey);
    }

    try {
      console.log('🔄 Executing Firestore query for aggregated data...');
      console.log('📍 Collection: datm_data');
      console.log('🔍 Query filters:', {
        datetime: `>= ${startDate.toISOString()} AND <= ${endDate.toISOString()}`,
        orderBy: 'datetime asc'
      });

      const q = query(
        collection(firestore, 'datm_data'),
        where('datetime', '>=', startDate),
        where('datetime', '<=', endDate),
        orderBy('datetime', 'asc')
      );

      console.log('⏱️ Starting aggregated data query execution...');
      const startTime = Date.now();
      
      const querySnapshot = await getDocs(q);
      const queryTime = Date.now() - startTime;
      
      console.log('✅ Aggregated data query completed:', {
        queryTime: `${queryTime}ms`,
        totalDocs: querySnapshot.size,
        empty: querySnapshot.empty
      });

      if (querySnapshot.empty) {
        console.warn('⚠️ No documents found for aggregated data');
        return [];
      }

      const rawData = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        rawData.push({
          id: doc.id,
          ...docData,
          datetime: docData.datetime.toDate ? docData.datetime.toDate() : docData.datetime
        });
      });

      console.log('📊 Raw data collected for aggregation:', {
        totalRawData: rawData.length,
        sampleRawData: rawData.slice(0, 2).map(d => ({
          datetime: d.datetime,
          pH: d.pH,
          temperature: d.temperature,
          turbidity: d.turbidity,
          salinity: d.salinity
        }))
      });

      // Aggregate data based on time filter
      console.log('🔄 Starting data aggregation for timeFilter:', timeFilter);
      const aggregatedData = this.aggregateData(rawData, timeFilter);
      
      console.log('✅ Data aggregation completed:', {
        originalCount: rawData.length,
        aggregatedCount: aggregatedData.length,
        sampleAggregated: aggregatedData.slice(0, 2)
      });

      // Cache the data
      this.cache.set(cacheKey, {
        data: aggregatedData,
        timestamp: Date.now()
      });
      
      console.log('💾 Aggregated data cached successfully:', {
        cacheKey,
        cacheSize: this.cache.size,
        dataCount: aggregatedData.length
      });

      return aggregatedData;
    } catch (error) {
      console.error('❌ Error fetching aggregated data:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        timeFilter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Return cached data if available
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        console.log('⚠️ Returning expired cached aggregated data due to error:', {
          cacheKey,
          cacheAge: `${Date.now() - cached.timestamp}ms`,
          dataCount: cached.data.length
        });
        return cached.data;
      }
      
      console.log('❌ No cached aggregated data available, returning empty array');
      return [];
    }
  }

  // Aggregate data based on time filter
  aggregateData(rawData, timeFilter) {
    console.log('🔄 Starting data aggregation:', {
      timeFilter,
      rawDataCount: rawData.length,
      timeRange: {
        start: rawData[0]?.datetime,
        end: rawData[rawData.length - 1]?.datetime
      }
    });

    let aggregatedData;
    if (timeFilter === 'daily') {
      aggregatedData = this.aggregateBy2Hour(rawData);
    } else if (timeFilter === 'weekly') {
      aggregatedData = this.aggregateByDay(rawData);
    } else if (timeFilter === 'monthly') {
      aggregatedData = this.aggregateByDay(rawData);
    } else if (timeFilter === 'annually') {
      aggregatedData = this.aggregateByMonth(rawData);
    } else {
      aggregatedData = rawData;
    }

    console.log('✅ Aggregation method selected:', {
      timeFilter,
      method: timeFilter === 'daily' ? 'aggregateBy2Hour' : 
              timeFilter === 'weekly' || timeFilter === 'monthly' ? 'aggregateByDay' :
              timeFilter === 'annually' ? 'aggregateByMonth' : 'rawData',
      resultCount: aggregatedData.length
    });

    return aggregatedData;
  }

  // Aggregate data into 2-hour intervals
  aggregateBy2Hour(data) {
    console.log('⏰ Aggregating data by 2-hour intervals');
    
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];

    data.forEach((reading, index) => {
      const date = new Date(reading.datetime);
      const hour = date.getHours();
      const twoHourBlock = Math.floor(hour / 2) * 2;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(twoHourBlock).padStart(2, '0')}:00:00`;

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

      parameters.forEach(param => {
        if (reading[param] !== undefined && reading[param] !== null) {
          aggregated[key][param].sum += reading[param];
          aggregated[key][param].count += 1;
        }
      });
      aggregated[key].count += 1;
    });

    const result = Object.values(aggregated).map(block => ({
      datetime: block.datetime,
      pH: block.pH.count > 0 ? block.pH.sum / block.pH.count : null,
      temperature: block.temperature.count > 0 ? block.temperature.sum / block.temperature.count : null,
      turbidity: block.turbidity.count > 0 ? block.turbidity.sum / block.turbidity.count : null,
      salinity: block.salinity.count > 0 ? block.salinity.sum / block.salinity.count : null
    }));

    console.log('✅ 2-hour aggregation completed:', {
      originalCount: data.length,
      aggregatedCount: result.length,
      timeBlocks: Object.keys(aggregated).length,
      sampleResult: result.slice(0, 2)
    });

    return result;
  }

  // Aggregate data by day
  aggregateByDay(data) {
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];

    data.forEach(reading => {
      const date = new Date(reading.datetime);
      const key = date.toISOString().split('T')[0];

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

      parameters.forEach(param => {
        if (reading[param] !== undefined && reading[param] !== null) {
          aggregated[key][param].sum += reading[param];
          aggregated[key][param].count += 1;
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

  // Aggregate data by month
  aggregateByMonth(data) {
    const aggregated = {};
    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];

    data.forEach(reading => {
      const date = new Date(reading.datetime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          datetime: new Date(date.getFullYear(), date.getMonth(), 1),
          count: 0,
          pH: { sum: 0, count: 0 },
          temperature: { sum: 0, count: 0 },
          turbidity: { sum: 0, count: 0 },
          salinity: { sum: 0, count: 0 }
        };
      }

      parameters.forEach(param => {
        if (reading[param] !== undefined && reading[param] !== null) {
          aggregated[key][param].sum += reading[param];
          aggregated[key][param].count += 1;
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

  // Get date range for reports based on filter
  getDateRange(timeFilter) {
    const now = new Date();
    let startDate, endDate;

    switch (timeFilter) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1, Sunday = 0
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'annually':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
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
