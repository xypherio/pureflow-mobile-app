import { fetchAllDocuments, fetchAllDocumentsBackend } from '../firebase/firestore';
import { alertManager } from './alertManager';
import { performanceMonitor } from '../../utils/performanceMonitor';

/**
 * Data preloader service for efficiently loading Firebase data during app startup
 */
class DataPreloader {
  constructor() {
    this.cache = {
      sensorData: null,
      alerts: null,
      lastFetch: null,
    };
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Preload all essential data for the dashboard
   * @returns {Promise<Object>} Preloaded data object
   */
  async preloadData() {
    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // If data is fresh (less than 5 minutes old), return cached data
    if (this.cache.lastFetch && Date.now() - this.cache.lastFetch < 5 * 60 * 1000) {
      return {
        sensorData: this.cache.sensorData,
        alerts: this.cache.alerts,
        fromCache: true,
      };
    }

    this.isLoading = true;
    this.loadPromise = this._fetchAllData();

    try {
      const result = await this.loadPromise;
      return result;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to fetch all required data
   * @private
   */
  async _fetchAllData() {
    return await performanceMonitor.measureAsync('dataPreloader.fetchAllData', async () => {
      try {
        console.log('🔄 Preloading Firebase data...');
        
        // Fetch sensor data in parallel for better performance
        const [sensorData] = await Promise.all([
          performanceMonitor.measureAsync('fetchSensorData', () => 
            fetchAllDocuments("datm_data", { 
              limitCount: 1000, // Limit to prevent excessive data loading
              orderByField: 'timestamp',
              orderDirection: 'desc'
            }).catch(error => {
              console.warn('Failed to fetch sensor data:', error);
              return [];
            })
          ),
          // Add more parallel data fetches here if needed
          // fetchAllDocumentsBackend("other_collection").catch(() => []),
        ]);

        // Process alerts from sensor data using AlertManager
        const alertResult = await performanceMonitor.measureAsync('processAlerts', () => 
          alertManager.processAlertsFromSensorData(sensorData)
        );
        const alerts = alertResult.alerts;

        // Update cache
        this.cache = {
          sensorData,
          alerts,
          lastFetch: Date.now(),
        };

        console.log(`✅ Data preloaded successfully`);
        performanceMonitor.logMemoryUsage();

        return {
          sensorData,
          alerts,
          fromCache: false,
        };
      } catch (error) {
        console.error('❌ Error preloading data:', error);
        throw error;
      }
    });
  }

  /**
   * Get cached data without fetching
   * @returns {Object|null} Cached data or null if not available
   */
  getCachedData() {
    if (!this.cache.lastFetch) return null;
    
    return {
      sensorData: this.cache.sensorData,
      alerts: this.cache.alerts,
      fromCache: true,
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = {
      sensorData: null,
      alerts: null,
      lastFetch: null,
    };
  }

  /**
   * Check if data is currently being loaded
   * @returns {boolean}
   */
  isDataLoading() {
    return this.isLoading;
  }
}

// Export singleton instance
export const dataPreloader = new DataPreloader();
export default dataPreloader;
