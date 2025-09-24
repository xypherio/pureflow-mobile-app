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
   * Fetches the most recent sensor data readings
   * @param {boolean} [useCache=true] - Whether to use cached data when available
   * @returns {Promise<Object>} Processed sensor data with metadata
   * @throws {Error} If there's an error fetching the data
   */
  async getMostRecentData(useCache = true) {
    return await this.performanceMonitor.measureAsync('realtimeData.getMostRecent', async () => {
      try {
        const dashboardData = await this.dashboardFacade.getDashboardData({ useCache });
        
        // Return processed data if available
        if (dashboardData?.current) {
          return dashboardData.current; // Data is already processed by the facade
        }
        
        console.warn('⚠️ No real-time data available from facade, returning default.');
        return this.getDefaultData();
      } catch (error) {
        console.error('❌ Error fetching real-time data:', error);
        return this.getDefaultData();
      }
    });
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
      // Status flags
      isRaining: false,
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataAge: 'No data',
    };
  }

  /**
   * @deprecated Caches are now managed automatically by their respective services.
   * This method is kept for backward compatibility.
   */
  clearCache() {
    console.warn('⚠️ `clearCache` is deprecated. Caches are managed by their respective services.');
    // Implementation note: If manual cache clearing is needed, uncomment:
    // this.dashboardFacade?.clearCache();
  }

}

// Create and export a singleton instance
const realtimeDataService = new RealtimeDataService();

export { realtimeDataService };
export default realtimeDataService;
