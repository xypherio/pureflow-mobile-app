import { fetchAllDocuments, fetchAllDocumentsBackend } from '@services/firebase/firestore.js';
import { alertManager } from './alertManager.js';
import { historicalAlertsService } from './historicalAlertsService.js';
import { performanceMonitor } from '@utils/performance-monitor.js';

/**
 * Data preloader service for efficiently loading Firebase data during app startup
 */
class DataPreloader {
  constructor() {
    this.cache = {
      sensorData: null,
      alerts: null,
      historicalAlerts: null,
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
        historicalAlerts: this.cache.historicalAlerts,
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
        
        // Fetch sensor data and historical alerts in parallel for better performance
        const [sensorData, historicalAlertsData] = await Promise.all([
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
          performanceMonitor.measureAsync('fetchHistoricalAlerts', () => 
            historicalAlertsService.getHistoricalAlerts().catch(error => {
              console.warn('Failed to fetch historical alerts:', error);
              return { sections: [], totalCount: 0 };
            })
          ),
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
          historicalAlerts: historicalAlertsData,
          lastFetch: Date.now(),
        };

        console.log(`✅ Data preloaded successfully`);
        console.log(`📊 Preloaded: ${sensorData.length} sensor records, ${alerts.length} active alerts, ${historicalAlertsData.totalCount || 0} historical alerts`);
        performanceMonitor.logMemoryUsage();

        return {
          sensorData,
          alerts,
          historicalAlerts: historicalAlertsData,
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
