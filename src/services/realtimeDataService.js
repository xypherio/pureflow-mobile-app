/**
 * Legacy RealtimeDataService Adapter
 * This class is now a lightweight adapter that delegates to the new facade-based architecture.
 */
class RealtimeDataService {
  constructor() {
    this.dashboardFacade = null;
    this.performanceMonitor = null;
    console.log('🔧 RealtimeDataService constructed');
  }

  postInitialize(dashboardFacade, performanceMonitor) {
    this.dashboardFacade = dashboardFacade;
    this.performanceMonitor = performanceMonitor;
    console.log('✅ RealtimeDataService post-initialized');
  }

  async getMostRecentData(useCache = true) {
    return await this.performanceMonitor.measureAsync('realtimeData.getMostRecent', async () => {
      const dashboardData = await this.dashboardFacade.getDashboardData({ useCache });
      
      if (dashboardData && dashboardData.current) {
        // The facade already processes and formats the data, including age.
        return dashboardData.current;
      }
      
      console.warn('⚠️ No real-time data available from facade, returning default.');
      return this.getDefaultData();
    });
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
    console.warn('`clearCache` is deprecated. Caches are managed by their respective services.');
    // This can be forwarded to the dashboard facade if a manual clear is needed.
    // e.g., this.dashboardFacade.clearCache();
  }

}

// Export singleton instance
export const realtimeDataService = new RealtimeDataService();
export default realtimeDataService;
