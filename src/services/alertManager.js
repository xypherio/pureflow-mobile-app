/**
 * Legacy AlertManager Adapter
 * This class is now a lightweight adapter that delegates to the new facade-based architecture.
 * It maintains the original API for backward compatibility during the migration.
 */
class AlertManager {
  constructor() {
    this.alertFacade = null;
    this.performanceMonitor = null;
    console.log('🔧 AlertManager constructed');
  }

  postInitialize(alertFacade, performanceMonitor) {
    this.alertFacade = alertFacade;
    this.performanceMonitor = performanceMonitor;
    console.log('✅ AlertManager post-initialized');
  }

  async processAlertsFromSensorData(sensorData) {
    return await this.performanceMonitor.measureAsync('alertManager.processAlerts', async () => {
      const result = await this.alertFacade.processSensorData(sensorData);
      // Adapt the new facade output to the legacy format
      return {
        alerts: result.processedAlerts,
        newAlerts: result.newAlerts,
        resolvedAlerts: result.resolvedAlerts || [],
        skipped: result.skipped,
        dataSignature: result.dataSignature || 'N/A',
        processedAt: result.timestamp,
      };
    });
  }


  async syncAlertsToFirebase() {
    // This is now handled automatically by the AlertManagementFacade and its underlying services.
    // This method is kept for backward compatibility.
    console.log('ℹ️ Firebase sync is now managed automatically. This legacy method call is a no-op.');
    return Promise.resolve({ synced: 0, errors: 0, message: 'Auto-sync enabled' });
  }

  async getActiveAlerts() {
    return await this.alertFacade.getAlertsForDisplay({ limit: 100 }); // Fetch a reasonable limit
  }

  async getHomepageAlerts(limit = 3) {
    const alerts = await this.alertFacade.getAlertsForDisplay({ limit });
    return alerts.map(alert => ({
      ...alert,
      displayMessage: `${alert.parameter.toUpperCase()}: ${alert.value.toFixed(2)}`,
    }));
  }


  async getNotificationAlerts() {
    const alerts = await this.alertFacade.getAlertsForDisplay({ limit: 100 });
    return alerts.map(alert => ({
      ...alert,
      message: alert.message || `${alert.title}: ${alert.value}`,
      timestamp: { seconds: Math.floor(new Date(alert.timestamp).getTime() / 1000) },
    }));
  }

  async clearAll() {
    await this.alertFacade.clearAllAlerts();
    console.log('🧹 Alert manager (adapter) cleared');
  }

  async getStatistics() {
    return await this.alertFacade.getAlertStatistics();
  }
}

// Export singleton instance
export const alertManager = new AlertManager();
export default alertManager;
