/**
 * Legacy DataPreloader Adapter
 * This class is now a lightweight adapter that delegates to the new facade-based architecture.
 * It maintains the original API for backward compatibility during the migration.
 */
class DataPreloader {
  constructor() {
    this.dashboardFacade = null;
    this.performanceMonitor = null;
    console.log('🔧 DataPreloader constructed');
  }

  postInitialize(dashboardFacade, performanceMonitor) {
    this.dashboardFacade = dashboardFacade;
    this.performanceMonitor = performanceMonitor;
    console.log('✅ DataPreloader post-initialized');
  }

  async preloadData() {
    return await this.performanceMonitor.measureAsync('dataPreloader.preloadData', async () => {
      const dashboardData = await this.dashboardFacade.getDashboardData();

      // Adapt the new facade output to the legacy format
      return {
        sensorData: dashboardData.today.data,
        alerts: dashboardData.alerts.active,
        dailyReport: dashboardData.current,
        // historicalAlerts is not part of the new facade's primary output, will be handled separately if needed
        historicalAlerts: { sections: [], totalCount: 0 }, 
        fromCache: dashboardData.metadata.fromCache || false,
      };
    });
  }

  // The following methods are now obsolete as caching and loading state are managed by the new services.
  // They are kept for backward compatibility but are now no-ops or return default values.
  getCachedData() {
    console.warn('`getCachedData` is deprecated. Data is now cached at the facade level.');
    return null;
  }

  clearCache() {
    console.warn('`clearCache` is deprecated. Caches are managed by their respective services.');
    // Forward the call to the relevant services if needed, e.g., this.dashboardFacade.clearCache();
  }

  isDataLoading() {
    // This state is now managed within the UI components or context
    return false;
  }
}

// Export singleton instance
export const dataPreloader = new DataPreloader();
export default dataPreloader;
