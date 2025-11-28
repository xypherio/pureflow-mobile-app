import { fetchAllDocuments } from '@services/firebase/firestore.js';
import { performanceMonitor } from '@utils/performance-monitor.js';

/**
 * Service for managing historical water quality alerts
 * Handles fetching, caching, and organizing alerts by time periods
 */
class HistoricalAlertsService {
  constructor() {
    // Initialize in-memory cache
    this.cache = {
      alerts: null,     
      timestamp: null,  
    };
    this.CACHE_DURATION = 60000; // Cache expires after 1 minute
  }

  /**
   * Fetches and returns historical alerts from Firebase
   * @param {Object} options - Configuration options
   *   - useCache: boolean - Use cached data if available (default: true)
   *   - limitCount: number - Max number of alerts to fetch (default: 100)
   *   - filterType: string - Filter by alert type
   *   - filterSeverity: string - Filter by severity level
   *   - filterParameter: string - Filter by water parameter
   * @returns {Promise<Object>} Processed and sectioned alerts
   */
  async getHistoricalAlerts(options = {}) {
    const {
      useCache = true,
      limitCount = 100,
      filterType = null,
      filterSeverity = null,
      filterParameter = null,
      startAfterDocumentId = null,
      batchSize = null
    } = options;

    return await performanceMonitor.measureAsync('historicalAlerts.fetch', async () => {
      try {
        // Return cached data if valid and requested
        if (useCache && this.cache.alerts && this.cache.timestamp) {
          const cacheAge = Date.now() - this.cache.timestamp;
          if (cacheAge < this.CACHE_DURATION) {
            console.log('📦 Using cached historical alerts');
            return this.processAndSectionAlerts(this.cache.alerts, filterType, filterSeverity, filterParameter);
          }
        }

        console.log('🔄 Fetching historical alerts from Firebase...');

        // Fetch alerts from Firebase ordered by timestamp (most recent first)
        console.log(`🔄 Fetching alerts from Firebase with limit: ${limitCount}`);
        const alerts = await fetchAllDocuments('alerts', {
          useCache: false,
          limitCount, // Use the dynamic limit count passed as parameter
          orderByField: 'timestamp',
          orderDirection: 'desc',
          startAfterDocumentId
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
   * Processes raw alerts by applying filters and organizing them into time-based sections
   * @param {Array} alerts - Raw alert objects from Firebase
   * @param {string} [filterType=null] - Filter by alert type (e.g., 'high', 'medium', 'low')
   * @param {string} [filterSeverity=null] - Filter by severity level
   * @param {string} [filterParameter=null] - Filter by water parameter (e.g., 'pH', 'temperature')
   * @returns {Object} Processed alerts with sections and metadata
   */
  processAndSectionAlerts(alerts, filterType = null, filterSeverity = null, filterParameter = null) {
    // Apply type filter if specified
    let filteredAlerts = alerts;
    if (filterType && filterType !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.type && alert.type.toLowerCase() === filterType.toLowerCase()
      );
    }
    
    // Apply severity filter if specified
    if (filterSeverity && filterSeverity !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.severity && alert.severity.toLowerCase() === filterSeverity.toLowerCase()
      );
    }
    
    // Apply parameter filter if specified
    if (filterParameter && filterParameter !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.parameter && alert.parameter.toLowerCase() === filterParameter.toLowerCase()
      );
    }
    
    // Remove duplicate alerts using a signature based on key properties
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

    // Process alerts for display and group by time periods
    const processedAlerts = filteredAlerts.map(alert => this.processAlertForDisplay(alert));
    const sections = this.groupAlertsByRecency(processedAlerts);

    return {
      sections,  // Alerts grouped by time period
      totalCount: filteredAlerts.length,  // Total alerts after filtering
      filteredCount: processedAlerts.length,  // Total unique alerts
      lastUpdated: Date.now(),  // Timestamp of last update
    };
  }

  /**
   * Formats a raw alert for consistent display in the UI
   * @param {Object} alert - Raw alert data from Firebase
   * @returns {Object} Formatted alert with all required display properties
   */
  processAlertForDisplay(alert) {
    return {
      id: alert.id,  // Unique identifier
      type: alert.type || 'info',  // Alert category
      title: alert.title || 'Unknown Alert',  // Short description
      message: alert.message || alert.title || 'No message available',  // Detailed message
      parameter: alert.parameter || 'Unknown',  // Water parameter (pH, temperature, etc.)
      severity: alert.severity || 'low',  // Severity level
      value: alert.value,  // Measured value
      threshold: alert.threshold,  // Threshold that was exceeded
      timestamp: this.normalizeTimestamp(alert),  // Normalized timestamp
      createdAt: alert.createdAt,  // Original creation time
      occurrenceCount: alert.occurrenceCount || 1,  // Number of occurrences
      dataAge: this.calculateAlertAge(alert),  // Human-readable age
    };
  }

  /**
   * Parse locale-formatted date string (e.g., "November 19, 2025 at 4:55:28 PM UTC+8")
   * @param {string} dateString - Date string to parse
   * @returns {Date|null} Parsed Date object or null if invalid
   */
  parseLocaleDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    // Match format: "Month DD, YYYY at HH:MM:SS AM/PM UTC+8"
    const match = dateString.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)\s+UTC([+-]\d+)$/);
    if (!match) return null;

    const [, monthName, day, year, hour, minute, second, ampm, utcOffset] = match;

    try {
      // Convert month name to number (0-11)
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthNames.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
      if (monthIndex === -1) return null;

      // Convert hour to 24-hour format
      let hour24 = parseInt(hour, 10);
      if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
      if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

      // Create Date object (in local timezone initially, then adjust for UTC offset)
      const date = new Date(parseInt(year), monthIndex, parseInt(day),
                           hour24, parseInt(minute), parseInt(second));

      // Check if the created date is valid
      if (isNaN(date.getTime())) return null;

      return date;
    } catch (error) {
      console.warn('Failed to parse locale date string:', dateString, error);
      return null;
    }
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
        timestamp = new Date(alert.timestamp * 1000); // Convert seconds to milliseconds if needed
      } else {
        timestamp = new Date(alert.timestamp);
      }
    } else if (alert.createdAt) {
      // Try standard Date parsing first (handles ISO strings)
      timestamp = new Date(alert.createdAt);

      // If that fails, try parsing as locale date string format
      if (!timestamp || isNaN(timestamp.getTime())) {
        timestamp = this.parseLocaleDateString(alert.createdAt);
      }
    }

    // If we still don't have a valid timestamp, try extracting from alert ID
    if (!timestamp || isNaN(timestamp.getTime())) {
      timestamp = this.extractTimestampFromAlertId(alert.id);
    }

    // Final fallback to current date if all else fails
    if (!timestamp || isNaN(timestamp.getTime())) {
      console.warn('Invalid timestamp for alert:', alert.id, alert.createdAt || 'none');
      timestamp = new Date();
    }

    return {
      seconds: Math.floor(timestamp.getTime() / 1000),
      date: timestamp,
    };
  }

  /**
   * Extract timestamp from alert ID if it follows the pattern: alert_[timestamp]_[suffix]
   * @param {string} alertId - The alert ID to extract timestamp from
   * @returns {Date|null} Extracted date or null if extraction fails
   */
  extractTimestampFromAlertId(alertId) {
    if (!alertId || typeof alertId !== 'string') return null;

    // Match pattern: alert_[digits]_[any characters]
    const match = alertId.match(/^alert_(\d+)_/);
    if (match && match[1]) {
      const timestampMs = parseInt(match[1], 10);
      // Validate that it's a reasonable timestamp (between 2020 and 2030)
      const date = new Date(timestampMs);
      const year = date.getFullYear();
      if (year >= 2020 && year <= 2030) {
        return date;
      }
    }

    return null;
  }

  /**
   * Organizes alerts into time-based groups for display
   * @param {Array} alerts - Processed alert objects
   * @returns {Array} Array of section objects for SectionList
   */
  groupAlertsByRecency(alerts) {
    // Define time boundaries for grouping
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Initialize groups for each time period
    const groups = {
      Today: [],       // Alerts from today
      Yesterday: [],   // Alerts from yesterday
      'This Week': [], // Alerts from this week (excluding today/yesterday)
      'Older': [],     // Alerts older than a week
    };

    // Categorize each alert into the appropriate time period
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

    // Convert groups to section format, removing empty sections
    return Object.keys(groups)
      .map(key => ({
        title: key,          // Section title (e.g., 'Today')
        data: groups[key].sort((a, b) => b.timestamp.date - a.timestamp.date),   // Sort alerts by timestamp descending (most recent first)
      }))
      .filter(section => section.data.length > 0);  // Only include non-empty sections
  }

  /**
   * Converts a timestamp into a human-readable relative time string
   * @param {Object} alert - Alert object with timestamp
   * @returns {string} Formatted time string (e.g., '2 min ago', '3 days ago')
   */
  calculateAlertAge(alert) {
    const alertTime = this.normalizeTimestamp(alert).date;
    const now = new Date();
    const ageMs = now - alertTime;

    // Handle invalid dates to prevent NaN results
    if (isNaN(ageMs) || ageMs < 0) {
      console.warn('Invalid age calculation for alert:', alert.id, alert.createdAt);
      return 'Time unknown';
    }

    // Return appropriate time string based on age
    if (ageMs < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (ageMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(ageMs / 60000);
      return `${minutes} min ago`;
    } else if (ageMs < 86400000) { // Less than 1 day
      const hours = Math.floor(ageMs / 3600000);
      return `${hours} hr ago`;
    } else { // One or more days
      const days = Math.floor(ageMs / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Returns an empty state for the alerts data structure
   * @returns {Object} Empty sections with default values
   */
  getEmptySections() {
    return {
      sections: [],         // Empty array for sections
      totalCount: 0,        // Total alerts (0 when empty)
      filteredCount: 0,     // Filtered count (0 when empty)
      lastUpdated: Date.now(), // Current timestamp
    };
  }

  /**
   * Fetches raw alerts for paginated accumulation (returns without processing or deduplication)
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Raw alerts and pagination cursor
   */
  async fetchPaginatedAlerts(options = {}) {
    const {
      startAfterDocumentId = null,
      batchSize = 30
    } = options;

    return await performanceMonitor.measureAsync('historicalAlerts.paginatedFetch', async () => {
      try {
        console.log('🔄 Fetching paginated alerts from Firebase...');

        const alerts = await fetchAllDocuments('alerts', {
          useCache: false,
          limitCount: batchSize,
          orderByField: 'timestamp',
          orderDirection: 'desc',
          startAfterDocumentId
        });

        console.log(`✅ Retrieved ${alerts.length} paginated alerts`);

        return {
          alerts, // Raw alerts without processing
          lastDocumentId: alerts.length > 0 ? alerts[alerts.length - 1].id : null,
          hasMore: alerts.length === batchSize
        };
      } catch (error) {
        console.error('❌ Error fetching paginated alerts:', error);
        throw error;
      }
    });
  }

  /**
   * Prefetch alerts for immediate availability during app launch
   * Uses a larger batch size and longer cache duration for better UX
   */
  async prefetchAlerts(options = {}) {
    const {
      limitCount = 50,
      cacheDuration = 30 * 60 * 1000, // 30 minutes for prefetched data
      useCache = false  // Don't use cache for prefetch, always fetch fresh
    } = options;

    return await performanceMonitor.measureAsync('historicalAlerts.prefetch', async () => {
      try {
        // Use a separate prefetch cache key to avoid conflict with regular fetches
        const prefetchCacheKey = 'prefetch_alerts';
        const now = Date.now();

        // Check if we have valid prefetched data
        if (useCache && this.cache.prefetch && this.cache.prefetch.alerts && this.cache.prefetch.timestamp) {
          const cacheAge = now - this.cache.prefetch.timestamp;
          if (cacheAge < cacheDuration) {
            console.log('📦 Using prefetched alerts cache');
            return { success: true, count: this.cache.prefetch.alerts.length };
          }
        }

        console.log('🔄 Prefetching historical alerts from Firebase...');

        // Fetch up to 50 alerts for prefetching
        const alerts = await fetchAllDocuments('alerts', {
          useCache: false,
          limitCount, // 50 alerts
          orderByField: 'timestamp',
          orderDirection: 'desc'
        });

        console.log(`✅ Prefetched ${alerts.length} historical alerts`);

        // Store in prefetch-specific cache
        if (!this.cache.prefetch) {
          this.cache.prefetch = {};
        }
        this.cache.prefetch = {
          alerts,
          timestamp: Date.now(),
          duration: cacheDuration
        };

        // Also store in main cache for compatibility (shorter TTL)
        this.cache = {
          alerts,
          timestamp: Date.now(),
        };

        return {
          success: true,
          count: alerts.length,
          cacheUntil: new Date(Date.now() + cacheDuration).toISOString()
        };

      } catch (error) {
        console.error('❌ Error prefetching alerts:', error);

        // Don't fail the entire operation if prefetch fails
        return {
          success: false,
          error: error.message,
          count: 0
        };
      }
    });
  }

  /**
   * Get prefetched alerts (used by notifications hook)
   */
  getPrefetchedAlerts() {
    if (this.cache.prefetch && this.cache.prefetch.alerts) {
      const cacheAge = Date.now() - this.cache.prefetch.timestamp;
      if (cacheAge < this.cache.prefetch.duration) {
        console.log('📦 Returning prefetched alerts for notifications');
        return this.cache.prefetch.alerts;
      } else {
        console.log('⏰ Prefetched alerts cache expired, will fetch fresh');
        // Clear expired prefetch cache
        this.cache.prefetch = null;
      }
    }
    return null;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = {
      alerts: null,
      timestamp: null,
      prefetch: null
    };
    console.log('🧹 Historical alerts cache cleared');
  }

  /**
   * Generates statistics about the current set of alerts
   * @returns {Promise<Object>} Statistics including counts by type, severity, and parameter
   */
  async getAlertStatistics() {
    try {
      // Fetch alerts with caching enabled
      const alertsData = await this.getHistoricalAlerts({ useCache: true });
      const alerts = alertsData.sections.flatMap(section => section.data);

      // Initialize statistics object
      const stats = {
        total: alerts.length,  // Total number of alerts
        byType: {},           // Counts by alert type
        bySeverity: {},       // Counts by severity level
        byParameter: {},      // Counts by water parameter
        recent: alerts.filter(alert => {
          // Count alerts from the last 24 hours
          const ageMs = Date.now() - alert.timestamp.date.getTime();
          return ageMs < 24 * 60 * 60 * 1000;
        }).length,
      };

      // Calculate statistics by iterating through all alerts once
      alerts.forEach(alert => {
        // Count by alert type (e.g., 'high_pH', 'low_temperature')
        stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        
        // Count by severity (e.g., 'high', 'medium', 'low')
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        
        // Count by parameter (e.g., 'pH', 'temperature')
        stats.byParameter[alert.parameter] = (stats.byParameter[alert.parameter] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      // Return empty statistics on error
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

// Create and export a singleton instance of the service
export const historicalAlertsService = new HistoricalAlertsService();
export default historicalAlertsService;
