/**
 * DataCacheService.js
 * 
 * A high-level caching service that provides type-safe access to cached data
 * with configurable caching policies for different data types.
 * 
 * Features:
 * - Type-specific caching policies (TTL, storage layer preferences)
 * - Automatic data compression for large datasets
 * - Cache invalidation by data type or prefix
 * - Monitoring and statistics
 * 
 * @module DataCacheService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Provides a type-safe interface for caching different types of application data
 * with configurable caching policies for each data type.
 */
export class DataCacheService {
    constructor(cacheManager) {
      this.cache = cacheManager;
      this.cachePolicies = {
        sensorData: {
          ttl: 5 * 60 * 1000, // 5 minutes
          useMemory: true,
          usePersistent: false
        },
        aggregatedData: {
          ttl: 15 * 60 * 1000, // 15 minutes
          useMemory: true,
          usePersistent: true
        },
        alerts: {
          ttl: 60 * 1000, // 1 minute
          useMemory: true,
          usePersistent: false
        },
        dailyReport: {
          ttl: 30 * 60 * 1000, // 30 minutes
          useMemory: true,
          usePersistent: true
        },
        historicalData: {
          ttl: 60 * 60 * 1000, // 1 hour
          useMemory: false, // Don't cache large datasets in memory
          usePersistent: true
        }
      };
    }
  
    // Sensor data caching
    async cacheSensorData(key, data) {
      const policy = this.cachePolicies.sensorData;
      return await this.cache.set(
        `sensor_${key}`, 
        data, 
        policy.ttl, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    /**
     * Retrieves cached sensor data.
     * 
     * @param {string} key - The cache key for the sensor data
     * @returns {Promise<Object|null>} The cached data or null if not found/expired
     */
    async getCachedSensorData(key) {
      const policy = this.cachePolicies.sensorData;
      return await this.cache.get(
        `sensor_${key}`, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    // Aggregated data caching (for reports)
    async cacheAggregatedData(timeFilter, dateRange, data) {
      const key = `aggregated_${timeFilter}_${dateRange.start}_${dateRange.end}`;
      const policy = this.cachePolicies.aggregatedData;
      
      return await this.cache.set(
        key, 
        data, 
        policy.ttl, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    /**
     * Retrieves cached aggregated data.
     * 
     * @param {string} timeFilter - Time filter used for aggregation
     * @param {Object} dateRange - Date range object with start and end dates
     * @param {string} dateRange.start - Start date in ISO format
     * @param {string} dateRange.end - End date in ISO format
     * @returns {Promise<Object|null>} The cached data or null if not found/expired
     */
    async getCachedAggregatedData(timeFilter, dateRange) {
      const key = `aggregated_${timeFilter}_${dateRange.start}_${dateRange.end}`;
      const policy = this.cachePolicies.aggregatedData;
      
      return await this.cache.get(
        key, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    // Alert data caching
    async cacheAlerts(key, alerts) {
      const policy = this.cachePolicies.alerts;
      return await this.cache.set(
        `alerts_${key}`, 
        alerts, 
        policy.ttl, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    /**
     * Retrieves cached alert data.
     * 
     * @param {string} key - The cache key for the alerts
     * @returns {Promise<Array<Object>|null>} The cached alerts or null if not found/expired
     */
    async getCachedAlerts(key) {
      const policy = this.cachePolicies.alerts;
      return await this.cache.get(
        `alerts_${key}`, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    // Daily report caching
    async cacheDailyReport(date, report) {
      const key = `daily_report_${date}`;
      const policy = this.cachePolicies.dailyReport;
      
      return await this.cache.set(
        key, 
        report, 
        policy.ttl, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    /**
     * Retrieves a cached daily report.
     * 
     * @param {string} date - Date string in YYYY-MM-DD format
     * @returns {Promise<Object|null>} The cached report or null if not found/expired
     */
    async getCachedDailyReport(date) {
      const key = `daily_report_${date}`;
      const policy = this.cachePolicies.dailyReport;
      
      return await this.cache.get(
        key, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    // Historical data caching (large datasets)
    async cacheHistoricalData(key, data) {
      const policy = this.cachePolicies.historicalData;
      
      // Compress large datasets before caching
      const compressedData = this.compressData(data);
      
      return await this.cache.set(
        `historical_${key}`, 
        compressedData, 
        policy.ttl, 
        policy.useMemory, 
        policy.usePersistent
      );
    }
  
    /**
     * Retrieves cached historical data.
     * Decompresses the data if it was compressed during storage.
     * 
     * @param {string} key - The cache key for the historical data
     * @returns {Promise<Array<Object>|null>} The cached data or null if not found/expired
     */
    async getCachedHistoricalData(key) {
      const policy = this.cachePolicies.historicalData;
      
      const compressedData = await this.cache.get(
        `historical_${key}`, 
        policy.useMemory, 
        policy.usePersistent
      );
      
      if (compressedData) {
        return this.decompressData(compressedData);
      }
      
      return null;
    }
  
    // Cache invalidation methods
    async invalidateSensorData(key = null) {
      if (key) {
        return await this.cache.delete(`sensor_${key}`);
      } else {
        // Invalidate all sensor data
        return await this.invalidateByPrefix('sensor_');
      }
    }
  
    /**
     * Invalidates cached aggregated data.
     * 
     * @param {string|null} timeFilter - Specific time filter to invalidate, or null for all
     * @returns {Promise<Object>} Results of the invalidation operation
     */
    async invalidateAggregatedData(timeFilter = null) {
      if (timeFilter) {
        return await this.invalidateByPrefix(`aggregated_${timeFilter}_`);
      } else {
        return await this.invalidateByPrefix('aggregated_');
      }
    }
  
    /**
     * Invalidates all cached alerts.
     * 
     * @returns {Promise<Object>} Results of the invalidation operation
     */
    async invalidateAlerts() {
      return await this.invalidateByPrefix('alerts_');
    }
  
    /**
     * Invalidates all cached daily reports.
     * 
     * @returns {Promise<Object>} Results of the invalidation operation
     */
    async invalidateDailyReports() {
      return await this.invalidateByPrefix('daily_report_');
    }
  
    /**
     * Invalidates all cached historical data.
     * 
     * @returns {Promise<Object>} Results of the invalidation operation
     */
    async invalidateHistoricalData() {
      return await this.invalidateByPrefix('historical_');
    }
  
    /**
     * Invalidates all cache entries with the specified prefix.
     * 
     * @param {string} prefix - The key prefix to match for invalidation
     * @returns {Promise<Object>} Results showing number of entries removed from each cache layer
     * @private
     */
    async invalidateByPrefix(prefix) {
      // For memory cache
      const memoryKeys = Array.from(this.cache.memoryCache.keys());
      const memoryMatches = memoryKeys.filter(key => key.startsWith(prefix));
      
      for (const key of memoryMatches) {
        this.cache.deleteMemory(key);
      }
  
      // For persistent cache
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const persistentMatches = allKeys.filter(key => 
          key.startsWith(`cache_${prefix}`)
        );
        
        if (persistentMatches.length > 0) {
          await AsyncStorage.multiRemove(persistentMatches);
        }
  
        console.log(`🗑️ Invalidated cache entries with prefix: ${prefix} (${memoryMatches.length} memory + ${persistentMatches.length} persistent)`);
        
        return {
          memory: memoryMatches.length,
          persistent: persistentMatches.length
        };
      } catch (error) {
        console.error('❌ Error invalidating persistent cache by prefix:', error);
        return {
          memory: memoryMatches.length,
          persistent: 0
        };
      }
    }
  
    // Data compression for large datasets
    compressData(data) {
      try {
        // Simple compression: remove unnecessary fields and round numbers
        if (Array.isArray(data)) {
          return data.map(item => {
            if (typeof item === 'object' && item !== null) {
              const compressed = {};
              
              // Keep essential fields only
              const essentialFields = ['id', 'datetime', 'timestamp', 'pH', 'temperature', 'turbidity', 'salinity'];
              
              for (const field of essentialFields) {
                if (item[field] !== undefined) {
                  if (typeof item[field] === 'number' && field !== 'id') {
                    // Round numbers to reduce size
                    compressed[field] = Math.round(item[field] * 100) / 100;
                  } else {
                    compressed[field] = item[field];
                  }
                }
              }
              
              return compressed;
            }
            return item;
          });
        }
        
        return data;
      } catch (error) {
        console.error('❌ Error compressing data:', error);
        return data;
      }
    }
  
    decompressData(compressedData) {
      // In this simple case, no decompression needed
      // In a real scenario, you might reverse compression algorithms
      return compressedData;
    }
  
    // Configuration methods
    setCachePolicy(dataType, policy) {
      if (this.cachePolicies[dataType]) {
        this.cachePolicies[dataType] = { ...this.cachePolicies[dataType], ...policy };
        console.log(`📝 Updated cache policy for ${dataType}:`, this.cachePolicies[dataType]);
      } else {
        console.warn(`⚠️ Unknown data type for cache policy: ${dataType}`);
      }
    }
  
    /**
     * Retrieves the current cache policy for a data type.
     * 
     * @param {string} dataType - The data type to get policy for
     * @returns {Object|null} The current policy or null if not found
     */
    getCachePolicy(dataType) {
      return this.cachePolicies[dataType] || null;
    }
  
    /**
     * Retrieves all cache policies.
     * 
     * @returns {Object} All current cache policies
     */
    getAllCachePolicies() {
      return { ...this.cachePolicies };
    }
  
    // Monitoring and stats
    async getCacheStatus() {
      const stats = this.cache.getStats();
      
      // Get cache sizes by type
      const sizesByType = {};
      
      // Memory cache analysis
      for (const key of this.cache.memoryCache.keys()) {
        const type = key.split('_')[0];
        sizesByType[type] = (sizesByType[type] || 0) + 1;
      }
  
      return {
        ...stats,
        sizesByType,
        policies: this.cachePolicies
      };
    }
  
    // Maintenance operations
    async performMaintenance() {
      console.log('🔧 Starting cache maintenance...');
      
      const memoryCleanedCount = this.cache.cleanExpiredMemoryEntries();
      const persistentCleanedCount = await this.cache.cleanExpiredPersistentEntries();
      
      console.log(`✅ Cache maintenance completed: ${memoryCleanedCount} memory + ${persistentCleanedCount} persistent entries cleaned`);
      
      return {
        memoryCleaned: memoryCleanedCount,
        persistentCleaned: persistentCleanedCount
      };
    }
  }
  
  
