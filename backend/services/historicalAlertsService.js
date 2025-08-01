import { fetchAllDocuments } from '../firebase/firestore';
import { performanceMonitor } from '../../utils/performanceMonitor';

/**
 * Historical Alerts Service for fetching and managing stored alerts from Firebase
 */
class HistoricalAlertsService {
  constructor() {
    this.cache = {
      alerts: null,
      timestamp: null,
    };
    this.CACHE_DURATION = 60000; // 1 minute cache for historical alerts
  }

  /**
   * Fetch historical alerts from Firebase with proper sectioning by recency
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Sectioned alerts data
   */
  async getHistoricalAlerts(options = {}) {
    const {
      useCache = true,
      limitCount = 100,
      filterType = null,
      filterSeverity = null,
      filterParameter = null
    } = options;

    return await performanceMonitor.measureAsync('historicalAlerts.fetch', async () => {
      try {
        // Check cache first
        if (useCache && this.cache.alerts && this.cache.timestamp) {
          const cacheAge = Date.now() - this.cache.timestamp;
          if (cacheAge < this.CACHE_DURATION) {
            console.log('📦 Using cached historical alerts');
            return this.processAndSectionAlerts(this.cache.alerts, filterType, filterSeverity, filterParameter);
          }
        }

        console.log('🔄 Fetching historical alerts from Firebase...');

        // Fetch alerts from Firebase ordered by timestamp (most recent first)
        const alerts = await fetchAllDocuments('alerts', {
          useCache: false,
          limitCount,
          orderByField: 'timestamp',
          orderDirection: 'desc'
        });

        console.log(`✅ Retrieved ${alerts.length} historical alerts`);

        // Update cache
        this.cache = {
          alerts,
          timestamp: Date.now(),
        };

        return this.processAndSectionAlerts(alerts, filterType, filterSeverity, filterParameter);

      } catch (error) {
        console.error('❌ Error fetching historical alerts:', error);
        
        // Return cached data if available, even if expired
        if (this.cache.alerts) {
          console.log('⚠️ Returning stale cached alerts due to error');
          return this.processAndSectionAlerts(this.cache.alerts, filterType, filterSeverity, filterParameter);
        }
        
        // Return empty sections as fallback
        return this.getEmptySections();
      }
    });
  }

  /**
   * Process alerts and organize them into sections by recency
   * @param {Array} alerts - Raw alerts from Firebase
   * @param {string} filterType - Filter by alert type
   * @param {string} filterSeverity - Filter by severity
   * @param {string} filterParameter - Filter by water parameter
   * @returns {Object} Sectioned alerts data
   */
  processAndSectionAlerts(alerts, filterType = null, filterSeverity = null, filterParameter = null) {
    // Filter alerts if needed
    let filteredAlerts = alerts;
    
    if (filterType && filterType !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === filterType);
    }
    
    if (filterSeverity && filterSeverity !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === filterSeverity);
    }
    
    if (filterParameter && filterParameter !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.parameter === filterParameter);
    }
    
    // Remove duplicates by alert signature (parameter + type + title + value)
    const uniqueAlerts = [];
    const seenSignatures = new Set();
    
    for (const alert of filteredAlerts) {
      const signature = `${alert.parameter}-${alert.type}-${alert.title}-${Math.round((alert.value || 0) * 100) / 100}`;
      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature);
        uniqueAlerts.push(alert);
      }
    }
    
    filteredAlerts = uniqueAlerts;
    console.log(`🔍 Filtered ${alerts.length} alerts to ${filteredAlerts.length} unique alerts`);

    // Process each alert for display
    const processedAlerts = filteredAlerts.map(alert => this.processAlertForDisplay(alert));

    // Group alerts by time periods
    const sections = this.groupAlertsByRecency(processedAlerts);

    return {
      sections,
      totalCount: filteredAlerts.length,
      filteredCount: processedAlerts.length,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Process individual alert for display in notifications tab
   * @param {Object} alert - Raw alert from Firebase
   * @returns {Object} Processed alert
   */
  processAlertForDisplay(alert) {
    return {
      id: alert.id,
      type: alert.type || 'info',
      title: alert.title || 'Unknown Alert',
      message: alert.message || alert.title || 'No message available',
      parameter: alert.parameter || 'Unknown',
      severity: alert.severity || 'low',
      value: alert.value,
      threshold: alert.threshold,
      timestamp: this.normalizeTimestamp(alert),
      createdAt: alert.createdAt,
      occurrenceCount: alert.occurrenceCount || 1,
      dataAge: this.calculateAlertAge(alert),
    };
  }

  /**
   * Normalize timestamp from various formats
   * @param {Object} alert - Alert object
   * @returns {Object} Normalized timestamp object
   */
  normalizeTimestamp(alert) {
    let timestamp;
    
    if (alert.timestamp) {
      // Handle Firestore timestamp
      if (alert.timestamp.toDate && typeof alert.timestamp.toDate === 'function') {
        timestamp = alert.timestamp.toDate();
      } else if (typeof alert.timestamp === 'number') {
        timestamp = new Date(alert.timestamp);
      } else {
        timestamp = new Date(alert.timestamp);
      }
    } else if (alert.createdAt) {
      timestamp = new Date(alert.createdAt);
    } else {
      timestamp = new Date();
    }

    return {
      seconds: Math.floor(timestamp.getTime() / 1000),
      date: timestamp,
    };
  }

  /**
   * Group alerts by recency (Today, Yesterday, This Week, Older)
   * @param {Array} alerts - Processed alerts
   * @returns {Array} Sections array for SectionList
   */
  groupAlertsByRecency(alerts) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'Older': [],
    };

    alerts.forEach(alert => {
      const alertDate = alert.timestamp.date;
      const alertDay = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate());

      if (alertDay.getTime() === today.getTime()) {
        groups.Today.push(alert);
      } else if (alertDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(alert);
      } else if (alertDate >= thisWeek) {
        groups['This Week'].push(alert);
      } else {
        groups['Older'].push(alert);
      }
    });

    // Convert to sections array, filtering out empty sections
    return Object.keys(groups)
      .map(key => ({
        title: key,
        data: groups[key],
      }))
      .filter(section => section.data.length > 0);
  }

  /**
   * Calculate how old an alert is
   * @param {Object} alert - Alert object
   * @returns {string} Human-readable alert age
   */
  calculateAlertAge(alert) {
    const alertTime = this.normalizeTimestamp(alert).date;
    const now = new Date();
    const ageMs = now - alertTime;

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

  /**
   * Get empty sections structure
   * @returns {Object} Empty sections data
   */
  getEmptySections() {
    return {
      sections: [],
      totalCount: 0,
      filteredCount: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = {
      alerts: null,
      timestamp: null,
    };
    console.log('🧹 Historical alerts cache cleared');
  }

  /**
   * Get alert statistics
   * @returns {Promise<Object>} Alert statistics
   */
  async getAlertStatistics() {
    try {
      const alertsData = await this.getHistoricalAlerts({ useCache: true });
      const alerts = alertsData.sections.flatMap(section => section.data);

      const stats = {
        total: alerts.length,
        byType: {},
        bySeverity: {},
        byParameter: {},
        recent: alerts.filter(alert => {
          const ageMs = Date.now() - alert.timestamp.date.getTime();
          return ageMs < 24 * 60 * 60 * 1000; // Last 24 hours
        }).length,
      };

      // Count by type
      alerts.forEach(alert => {
        stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        stats.byParameter[alert.parameter] = (stats.byParameter[alert.parameter] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      return {
        total: 0,
        byType: {},
        bySeverity: {},
        byParameter: {},
        recent: 0,
      };
    }
  }
}

// Export singleton instance
export const historicalAlertsService = new HistoricalAlertsService();
export default historicalAlertsService;
