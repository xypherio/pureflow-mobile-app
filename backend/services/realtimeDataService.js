import { performanceMonitor } from '../../utils/performanceMonitor';
import { fetchAllDocuments } from '../firebase/firestore';

class RealtimeDataService {
  constructor() {
    this.cache = {
      data: null,
      timestamp: null,
    };
    this.CACHE_DURATION = 30000; 
  }

  async getMostRecentData(useCache = true) {
    return await performanceMonitor.measureAsync('realtimeData.getMostRecent', async () => {
      try {
        // Check cache first
        if (useCache && this.cache.data && this.cache.timestamp) {
          const cacheAge = Date.now() - this.cache.timestamp;
          if (cacheAge < this.CACHE_DURATION) {
            console.log('📦 Using cached real-time data');
            return this.cache.data;
          }
        }

        console.log('🔄 Fetching most recent sensor data from Firestore...');

        // Fetch the most recent data ordered by datetime field
        const recentData = await fetchAllDocuments('datm_data', {
          useCache: false, // Always fetch fresh for real-time data
          limitCount: 1,   // Only get the most recent record
          orderByField: 'datetime', // Order by datetime field
          orderDirection: 'desc'    // Most recent first
        });

        if (!recentData || recentData.length === 0) {
          console.warn('⚠️ No recent sensor data found');
          return this.getDefaultData();
        }

        const mostRecent = recentData[0];
        console.log(`✅ Retrieved most recent data from: ${this.formatDateTime(mostRecent.datetime)}`);

        // Process and normalize the data
        const processedData = this.processRealtimeData(mostRecent);

        // Update cache
        this.cache = {
          data: processedData,
          timestamp: Date.now(),
        };

        return processedData;

      } catch (error) {
        console.error('❌ Error fetching most recent sensor data:', error);
        
        // Return cached data if available, even if expired
        if (this.cache.data) {
          console.log('⚠️ Returning stale cached data due to error');
          return this.cache.data;
        }
        
        // Return default data as fallback
        return this.getDefaultData();
      }
    });
  }

  processRealtimeData(rawData) {
    const processed = {
      id: rawData.id,
      datetime: rawData.datetime,
      timestamp: this.parseDateTime(rawData.datetime),
      
      // Water quality parameters (using canonical field names)
      pH: this.parseNumericValue(rawData.pH),
      temperature: this.parseNumericValue(rawData.temperature),
      turbidity: this.parseNumericValue(rawData.turbidity),
      salinity: this.parseNumericValue(rawData.salinity),
      
      // Additional parameters
      isRaining: Boolean(rawData.isRaining),
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataAge: this.calculateDataAge(rawData.datetime),
    };

    return processed;
  }

  parseNumericValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  parseDateTime(datetime) {
    if (!datetime) return new Date();
    
    if (datetime.toDate && typeof datetime.toDate === 'function') {
      return datetime.toDate();
    }
    
    // Handle ISO string or other formats
    return new Date(datetime);
  }

  calculateDataAge(datetime) {
    const dataTime = this.parseDateTime(datetime);
    const now = new Date();
    const ageMs = now - dataTime;
    
    if (ageMs < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (ageMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(ageMs / 60000);
      return `${minutes} min ago`;
    } else if (ageMs < 86400000) { // Less than 1 day
      const hours = Math.floor(ageMs / 3600000);
      return `${hours} hr ago`;
    } else {
      const days = Math.floor(ageMs / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  formatDateTime(datetime) {
    const date = this.parseDateTime(datetime);
    return date.toLocaleString();
  }
  getDefaultData() {
    return {
      id: 'default',
      datetime: new Date().toISOString(),
      timestamp: new Date(),
      pH: null,
      temperature: null,
      turbidity: null,
      salinity: null,
      isRaining: false,
      lastUpdated: new Date().toISOString(),
      dataAge: 'No data',
    };
  }

  clearCache() {
    this.cache = {
      data: null,
      timestamp: null,
    };
    console.log('🧹 Real-time data cache cleared');
  }

  isRealTime(data) {
    if (!data || !data.datetime) return false;
    
    const dataTime = this.parseDateTime(data.datetime);
    const now = new Date();
    const ageMs = now - dataTime;
    
    return ageMs < 300000; // 5 minutes
  }
}

// Export singleton instance
export const realtimeDataService = new RealtimeDataService();
export default realtimeDataService;
