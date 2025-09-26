/**
 * Optimized Data Manager for efficient data fetching and distribution
 * 
 * This service implements a two-phase data loading strategy:
 * 1. Initial load: Fetch all historical data during app launch
 * 2. Incremental updates: Fetch only the most recent single record for updates
 * 
 * Components receive data through optimized contexts that prevent unnecessary re-renders
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { historicalDataService } from './historicalDataService';
import { realtimeDataService } from './realtimeDataService';
import { waterQualityNotificationService } from './WaterQualityNotificationService';

class OptimizedDataManager {
  constructor() {
    this.isInitialized = false;
    this.initialData = null;
    this.chartData = [];
    this.realtimeData = null;
    this.lastUpdateTime = null;
    this.subscribers = new Map();
    this.updateInterval = null;
    this.isUpdating = false;
    
    // Cache keys
    this.CHART_DATA_KEY = 'optimized_chart_data';
    this.REALTIME_DATA_KEY = 'optimized_realtime_data';
    this.INITIAL_DATA_KEY = 'optimized_initial_data';
    
    console.log('🔧 OptimizedDataManager constructed');
  }

  /**
   * Initialize the data manager with initial data loading
   * This should be called once during app launch
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ DataManager already initialized');
      return this.getCurrentData();
    }

    console.log('🚀 Initializing OptimizedDataManager...');
    
    try {
      // Try to load cached data first
      const cachedData = await this.loadCachedData();
      if (cachedData) {
        console.log('📦 Using cached initial data');
        this.initialData = cachedData;
        this.chartData = cachedData.chartData || [];
        this.realtimeData = cachedData.realtimeData || null;
        this.lastUpdateTime = cachedData.lastUpdateTime || Date.now();
      }

      // Fetch fresh initial data
      await this.performInitialLoad();
      
      // Set up incremental updates
      this.setupIncrementalUpdates();
      
      this.isInitialized = true;
      console.log('✅ OptimizedDataManager initialized successfully');
      
      return this.getCurrentData();
      
    } catch (error) {
      console.error('❌ Error initializing OptimizedDataManager:', error);
      throw error;
    }
  }

  /**
   * Perform initial data loading (full historical data)
   * This is called only once during app launch
   */
  async performInitialLoad() {
    console.log('📊 Performing initial data load...');
    
    try {
      // Fetch historical data for charts (last 24 hours)
      const historicalData = await historicalDataService.getCurrentDayData();

      // Fetch current real-time data with monitoring
      let fetchSuccess = false;
      const currentData = await realtimeDataService.getMostRecentData({ useCache: false })
        .then(data => {
          // Monitor successful fetch
          waterQualityNotificationService.monitorDataFetch(true, { deviceName: 'DATM' });
          fetchSuccess = true;
          return data;
        })
        .catch(error => {
          // Monitor failed fetch
          waterQualityNotificationService.monitorDataFetch(false, {
            deviceName: 'DATM',
            error: error.message
          });
          console.warn('⚠️ Initial data fetch failed:', error);
          return null;
        });
      
      // Process and store the data
      this.chartData = this.processChartData(historicalData);
      this.realtimeData = this.processRealtimeData(currentData);
      this.lastUpdateTime = Date.now();
      
      // Create initial data object
      this.initialData = {
        chartData: this.chartData,
        realtimeData: this.realtimeData,
        lastUpdateTime: this.lastUpdateTime,
        timestamp: new Date().toISOString()
      };
      
      // Cache the initial data
      await this.cacheInitialData();
      
      // Notify all subscribers
      this.notifySubscribers('initialLoad', this.initialData);
      
      console.log('✅ Initial data load completed:', {
        chartDataPoints: this.chartData.length,
        realtimeData: !!this.realtimeData,
        timestamp: this.lastUpdateTime
      });
      
    } catch (error) {
      console.error('❌ Error in initial data load:', error);
      throw error;
    }
  }

  /**
   * Perform incremental update (single most recent record)
   * This is called periodically after initial load
   */
  async performIncrementalUpdate() {
    if (this.isUpdating) {
      console.log('⏳ Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    console.log('🔄 Performing incremental update...');
    
    try {
      // Fetch only the most recent data
      const newData = await realtimeDataService.getMostRecentData({ useCache: false });
      
      if (!newData || !newData.timestamp) {
        console.log('⚠️ No new data available for incremental update');
        return;
      }
      
      // Check if this is actually new data
      const newTimestamp = new Date(newData.timestamp).getTime();
      const lastTimestamp = this.realtimeData ? new Date(this.realtimeData.timestamp).getTime() : 0;
      
      if (newTimestamp <= lastTimestamp) {
        console.log('⚠️ No new data since last update');
        return;
      }
      
      // Monitor successful fetch
      waterQualityNotificationService.monitorDataFetch(true, { deviceName: 'DATM' });

      // Process sensor data with threshold alerts
      if (waterQualityNotificationService.processSensorDataWithThresholdAlerts) {
        await waterQualityNotificationService.processSensorDataWithThresholdAlerts(newData);
      }

      // Update real-time data
      const previousRealtimeData = this.realtimeData;
      this.realtimeData = this.processRealtimeData(newData);
      this.lastUpdateTime = Date.now();

      // Add new point to chart data (incremental)
      const newChartPoint = this.createChartDataPoint(newData);
      this.chartData = [...this.chartData, newChartPoint];
      
      // Keep only last 100 points to prevent memory issues
      if (this.chartData.length > 100) {
        this.chartData = this.chartData.slice(-100);
      }
      
      // Create update data object
      const updateData = {
        type: 'incremental',
        realtimeData: this.realtimeData,
        previousRealtimeData,
        newChartPoint,
        chartData: this.chartData,
        lastUpdateTime: this.lastUpdateTime,
        timestamp: new Date().toISOString()
      };
      
      // Cache the updated data
      await this.cacheIncrementalData(updateData);
      
      // Notify subscribers with incremental update
      this.notifySubscribers('incrementalUpdate', updateData);
      
      console.log('✅ Incremental update completed:', {
        newDataTimestamp: newData.timestamp,
        chartDataPoints: this.chartData.length,
        updateType: 'incremental'
      });
      
    } catch (error) {
      console.error('❌ Error in incremental update:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Set up incremental updates with optimized interval
   */
  setupIncrementalUpdates() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Set up 30-second incremental updates
    this.updateInterval = setInterval(() => {
      this.performIncrementalUpdate();
    }, 30000); // 30 seconds
    
    console.log('⏰ Incremental updates scheduled every 30 seconds');
  }

  /**
   * Process chart data for efficient rendering
   */
  processChartData(historicalData) {
    if (!historicalData || !Array.isArray(historicalData)) {
      return [];
    }
    
    return historicalData
      .filter(item => item && item.datetime)
      .map(item => ({
        datetime: new Date(item.datetime),
        timestamp: new Date(item.datetime).getTime(),
        pH: item.pH || null,
        temperature: item.temperature || null,
        turbidity: item.turbidity || null,
        salinity: item.salinity || null,
        id: `chart_${new Date(item.datetime).getTime()}`
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Process real-time data for component consumption
   */
  processRealtimeData(data) {
    if (!data) return null;
    
    return {
      id: data.id || 'realtime_latest',
      timestamp: data.timestamp || new Date().toISOString(),
      datetime: new Date(data.timestamp || Date.now()),
      pH: data.pH || null,
      temperature: data.temperature || null,
      turbidity: data.turbidity || null,
      salinity: data.salinity || null,
      isRaining: data.isRaining || false,
      lastUpdated: new Date().toISOString(),
      dataAge: this.calculateDataAge(data.timestamp)
    };
  }

  /**
   * Create a single chart data point from real-time data
   */
  createChartDataPoint(realtimeData) {
    const timestamp = new Date(realtimeData.timestamp).getTime();
    
    return {
      datetime: new Date(realtimeData.timestamp),
      timestamp,
      pH: realtimeData.pH || null,
      temperature: realtimeData.temperature || null,
      turbidity: realtimeData.turbidity || null,
      salinity: realtimeData.salinity || null,
      id: `chart_${timestamp}`
    };
  }

  /**
   * Calculate data age for display
   */
  calculateDataAge(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
      const now = Date.now();
      const dataTime = new Date(timestamp).getTime();
      
      // Check if timestamp is valid
      if (isNaN(dataTime)) return 'Invalid timestamp';
      
      const ageMs = now - dataTime;
      const ageSeconds = Math.floor(ageMs / 1000);
      
      if (ageSeconds < 60) return `${ageSeconds}s ago`;
      if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
      return `${Math.floor(ageSeconds / 3600)}h ago`;
    } catch (error) {
      console.error('Error calculating data age:', error);
      return 'Unknown';
    }
  }

  /**
   * Get current data state
   */
  getCurrentData() {
    return {
      chartData: this.chartData,
      realtimeData: this.realtimeData,
      lastUpdateTime: this.lastUpdateTime,
      isInitialized: this.isInitialized,
      dataAge: this.realtimeData ? this.calculateDataAge(this.realtimeData.timestamp) : 'No data'
    };
  }

  /**
   * Subscribe to data updates
   */
  subscribe(id, callback) {
    this.subscribers.set(id, callback);
    console.log(`📡 Subscriber ${id} registered`);
    
    // Send current data immediately
    if (this.isInitialized) {
      callback('current', this.getCurrentData());
    }
    
    return () => {
      this.subscribers.delete(id);
      console.log(`📡 Subscriber ${id} unregistered`);
    };
  }

  /**
   * Notify all subscribers of data changes
   */
  notifySubscribers(type, data) {
    this.subscribers.forEach((callback, id) => {
      try {
        callback(type, data);
      } catch (error) {
        console.error(`❌ Error notifying subscriber ${id}:`, error);
      }
    });
  }

  /**
   * Cache initial data
   */
  async cacheInitialData() {
    try {
      const cacheData = {
        chartData: this.chartData,
        realtimeData: this.realtimeData,
        lastUpdateTime: this.lastUpdateTime,
        timestamp: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(this.INITIAL_DATA_KEY, JSON.stringify(cacheData));
      console.log('💾 Initial data cached successfully');
    } catch (error) {
      console.error('❌ Error caching initial data:', error);
    }
  }

  /**
   * Cache incremental update data
   */
  async cacheIncrementalData(updateData) {
    try {
      const cacheData = {
        chartData: updateData.chartData,
        realtimeData: updateData.realtimeData,
        lastUpdateTime: updateData.lastUpdateTime,
        timestamp: updateData.timestamp
      };
      
      await AsyncStorage.setItem(this.INITIAL_DATA_KEY, JSON.stringify(cacheData));
      console.log('💾 Incremental data cached successfully');
    } catch (error) {
      console.error('❌ Error caching incremental data:', error);
    }
  }

  /**
   * Load cached data
   */
  async loadCachedData() {
    try {
      const cached = await AsyncStorage.getItem(this.INITIAL_DATA_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Loaded cached data from storage');
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading cached data:', error);
    }
    return null;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.subscribers.clear();
    this.isInitialized = false;
    
    console.log('🧹 OptimizedDataManager destroyed');
  }
}

// Create and export singleton instance
const optimizedDataManager = new OptimizedDataManager();

export { optimizedDataManager };
export default optimizedDataManager;
