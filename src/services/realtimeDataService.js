import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@services/firebase/config';

/**
 * Service for managing real-time sensor data operations.
 *
 * This is a facade adapter that delegates to the new dashboard facade architecture
 * while maintaining backward compatibility with legacy code.
 *
 * @class RealtimeDataService
 */
class RealtimeDataService {
  constructor() {
    /** @private */
    this.dashboardFacade = null;      // Reference to the dashboard facade for data operations
    /** @private */
    this.performanceMonitor = null;    // Performance monitoring utility
    
    // Cache management
    this._cache = new Map();
    this._pendingRequests = new Map();
    this.CACHE_TTL = 30000; // 30 seconds
    
    console.log('🔧 RealtimeDataService constructed');
  }

  /**
   * Completes the service initialization with required dependencies
   * @param {Object} dashboardFacade - The dashboard facade instance
   * @param {Object} performanceMonitor - Performance monitoring utility
   */
  postInitialize(dashboardFacade, performanceMonitor) {
    this.dashboardFacade = dashboardFacade;
    this.performanceMonitor = performanceMonitor;
    console.log('✅ RealtimeDataService post-initialized');
  }

  /**
   * Fetches the most recent sensor data readings with optimized caching
   * @param {Object} [options] - Fetching options
   * @param {boolean} [options.useCache=true] - Whether to use cached data when available
   * @param {number} [options.cacheTtl] - Cache TTL in milliseconds (default: 30s)
   * @returns {Promise<Object>} Processed sensor data with metadata
   */
  async getMostRecentData({ useCache = true, cacheTtl } = {}) {
    const CACHE_KEY = 'realtime_data_latest';
    const now = Date.now();
    const ttl = cacheTtl !== undefined ? cacheTtl : this.CACHE_TTL;

    // Return existing promise if request is in progress
    if (this._pendingRequests.has(CACHE_KEY)) {
      console.log('🔄 Returning pending request');
      return this._pendingRequests.get(CACHE_KEY);
    }
    
    // Check cache if enabled
    if (useCache && this._cache.has(CACHE_KEY)) {
      const { data, timestamp } = this._cache.get(CACHE_KEY);
      if ((now - timestamp) < ttl) {
        console.log('📦 Using cached real-time data');
        return data;
      }
    }
    
    try {
      // Create and store the promise to handle concurrent requests
      const requestPromise = (async () => {
        try {
          const dashboardData = await this.performanceMonitor.measureAsync(
            'realtimeData.getMostRecent', 
            async () => {
              const data = await this.dashboardFacade.getDashboardData({ 
                useCache: true,
                includeHistorical: false,
                historicalLimit: 1
              });
              return data?.current || this.getDefaultData();
            }
          );
          
          // Update cache
          this._cache.set(CACHE_KEY, {
            data: dashboardData,
            timestamp: Date.now()
          });
          
          return dashboardData;
        } finally {
          // Clean up pending request
          this._pendingRequests.delete(CACHE_KEY);
        }
      })();
      
      // Store the promise to handle concurrent requests
      this._pendingRequests.set(CACHE_KEY, requestPromise);
      
      return await requestPromise;
      
    } catch (error) {
      console.error('❌ Error in getMostRecentData:', error);
      
      // Return cached data if available, even if expired
      if (this._cache.has(CACHE_KEY)) {
        console.warn('⚠️ Using stale cached data due to fetch error');
        return this._cache.get(CACHE_KEY).data;
      }
      
      // If no cached data is available, return default data
      return this.getDefaultData();
    }
  }

  /**
   * Returns a default/fallback data object when no real data is available
   * @returns {Object} Default sensor data structure with null values
   */
  getDefaultData() {
    return {
      id: 'default',
      datetime: new Date().toISOString(), // ISO string for consistency
      timestamp: new Date(),              // Date object for easier manipulation
      // Sensor readings (will be null when no data)
      pH: null,
      temperature: null,
      turbidity: null,
      salinity: null,
      // Device environmental sensor data
      humidity: null,
      datmTemp: null,
      // Status flags
      isRaining: false,
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataAge: 'No data',
    };
  }

  /**
   * Clears the cache for a specific key or all caches if no key is provided
   * @param {string} [key] - Optional cache key to clear
   */
  clearCache(key) {
    if (key) {
      this._cache.delete(key);
      console.log(`🧹 Cleared cache for key: ${key}`);
    } else {
      this._cache.clear();
      console.log('🧹 Cleared all caches');
    }
  }
  
  /**
   * Clears expired cache entries
   * @private
   */
  _clearExpiredCache() {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, { timestamp }] of this._cache.entries()) {
      if ((now - timestamp) > this.CACHE_TTL) {
        this._cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
    }
  }
  
  /**
   * Clears expired cache entries
   * Can be called periodically to clean up old data
   */
  clearExpiredCache() {
    this._clearExpiredCache();
  }

  /**
   * Sets up a real-time listener for the most recent sensor data
   * @param {Function} callback - Callback function to handle new data
   * @returns {Function} Unsubscribe function to stop listening
   */
  subscribeToRealtimeData(callback) {
    console.log('🔄 Setting up real-time listener for datm_data collection');

    // Query for the most recent document ordered by datetime
    const collectionRef = collection(db, 'datm_data');
    const q = query(collectionRef, orderBy('datetime', 'desc'), limit(1));

    // Set up the real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('📡 Real-time data update received');

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const rawData = { id: doc.id, ...doc.data() };

        // Normalize the data
        const normalizedData = this.normalizeRealtimeData(rawData);
        callback(normalizedData);
      } else {
        console.log('📡 No real-time data available');
        callback(null);
      }
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
      callback(null);
    });

    return unsubscribe;
  }

  /**
   * Normalizes real-time sensor data for consistent structure
   * @param {Object} rawData - Raw data from Firebase
   * @returns {Object} Normalized data with consistent types
   */
  normalizeRealtimeData(rawData) {
    return {
      id: rawData.id,
      datetime: this.normalizeDateTime(rawData.datetime),
      timestamp: this.normalizeDateTime(rawData.datetime),

      // Water quality parameters - ensure numeric types
      pH: rawData.pH ? Number(rawData.pH) : null,
      temperature: rawData.temperature ? Number(rawData.temperature) : null,
      turbidity: rawData.turbidity ? Number(rawData.turbidity) : null,
      salinity: rawData.salinity ? Number(rawData.salinity) : null,

      // Device environmental sensor data
      humidity: rawData.humidity ? Number(rawData.humidity) : null,
      datmTemp: rawData.datmTemp ? Number(rawData.datmTemp) : null,

      // Environmental data
      isRaining: rawData.isRaining ? Number(rawData.isRaining) : 0,

      // Metadata
      lastUpdated: this.normalizeDateTime(rawData.datetime),
      source: rawData.source || 'realtime'
    };
  }

  /**
   * Normalizes date/time values from different Firebase formats
   * @param {any} dateValue - Date value from Firebase
   * @returns {Date} Normalized Date object
   */
  normalizeDateTime(dateValue) {
    if (!dateValue) return new Date();

    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }

    // Handle numeric timestamps
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }

    // Fallback
    return new Date(dateValue);
  }

}

// Create and export a singleton instance
const realtimeDataService = new RealtimeDataService();

export { realtimeDataService };
export default realtimeDataService;
