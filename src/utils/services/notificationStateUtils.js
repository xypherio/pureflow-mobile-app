// Notification State Management Utilities
// Utilities for managing notification deduplication, state, and lifecycle

import {
  NOTIFICATION_SERVICE_CONFIG,
  SERVICE_LOGGING_CONFIG
} from '../../constants/services.js';

/**
 * Logs notification state operations
 * @param {string} operation - Operation name
 * @param {...any} args - Additional log arguments
 */
function logNotificationState(operation, ...args) {
  if (!SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) return;

  if (SERVICE_LOGGING_CONFIG.CURRENT_LEVEL >= SERVICE_LOGGING_CONFIG.LOG_LEVELS.DEBUG) {
    console.log(`[NotificationState:${operation}]`, ...args);
  }
}

/**
 * Notification State Manager Class
 * Handles deduplication, cleanup, and notification lifecycle management
 */
export class NotificationStateManager {
  constructor() {
    this.recentNotifications = new Map();
    this.deduplicationWindow = NOTIFICATION_SERVICE_CONFIG.DEDUPLICATION_WINDOW_MS;
    this.cleanupInterval = null;
    this.maxRecentNotifications = NOTIFICATION_SERVICE_CONFIG.MAX_RECENT_NOTIFICATIONS;

    // Auto-start cleanup
    this.startCleanupTimer();

    logNotificationState('initialized');
  }

  /**
   * Check if a notification can be sent (deduplication check)
   * @param {string} notificationKey - Unique notification key
   * @param {string} severity - Notification severity level
   * @returns {boolean} Whether notification can be sent
   */
  canSendNotification(notificationKey, severity = 'warning') {
    const recentNotificationsForKey = this.recentNotifications.get(notificationKey) || [];
    const now = Date.now();

    // Clear expired notifications first
    const validNotifications = this._filterExpiredNotifications(recentNotificationsForKey);

    // Update the stored array with valid notifications
    this.recentNotifications.set(notificationKey, validNotifications);

    // Check if we have any notifications with same severity
    const hasMatchingSeverity = validNotifications.some(
      notification => notification.severity === severity
    );

    if (hasMatchingSeverity) {
      logNotificationState('duplicate_blocked', `Duplicate ${severity} notification blocked: ${notificationKey}`);
      return false;
    }

    return true;
  }

  /**
   * Record a successfully sent notification for deduplication tracking
   * @param {string} notificationKey - Unique notification key
   * @param {string} severity - Notification severity level
   */
  recordNotification(notificationKey, severity = 'warning') {
    const currentNotifications = this.recentNotifications.get(notificationKey) || [];

    // Add new notification
    currentNotifications.push({
      timestamp: Date.now(),
      severity: severity
    });

    // Keep only the most recent notifications
    if (currentNotifications.length > this.maxRecentNotifications) {
      currentNotifications.shift();
    }

    this.recentNotifications.set(notificationKey, currentNotifications);
    logNotificationState('recorded', `Notification recorded: ${notificationKey} (${severity})`);
  }

  /**
   * Remove a notification from tracking (e.g., if it failed to send)
   * @param {string} notificationKey - Unique notification key
   * @param {string} severity - Notification severity level
   */
  removeNotification(notificationKey, severity = 'warning') {
    const currentNotifications = this.recentNotifications.get(notificationKey) || [];

    // Remove the most recent notification with matching severity
    const filteredNotifications = currentNotifications.filter(
      notification => notification.severity !== severity ||
                      notification === currentNotifications[currentNotifications.length - 1]
    );

    if (filteredNotifications.length !== currentNotifications.length) {
      this.recentNotifications.set(notificationKey, filteredNotifications);
      logNotificationState('removed', `Notification removed: ${notificationKey} (${severity})`);
    }
  }

  /**
   * Generate deduplication key for various notification types
   * @param {Object} params - Parameters for key generation
   * @returns {string} Unique notification key
   */
  generateNotificationKey(type, ...params) {
    switch (type) {
      case 'device_status':
        return `device_status_${params[0]}_${params[1]}`; // deviceName, status

      case 'water_quality':
        return `water_quality_${params[0]}_${params[1]}`; // parameter, alertLevel

      case 'calibration':
        return `calibration_${params[0]}`; // parameter

      case 'data_sync':
        return `data_sync_${params[0] ? 'success' : 'failed'}`; // success boolean

      case 'forecast':
        return `forecast_${params[0]}`; // parameter

      case 'maintenance':
        return `maintenance_${params[0]}`; // task

      default:
        return `custom_${type}_${params.join('_')}`;
    }
  }

  /**
   * Start periodic cleanup of old notification records
   */
  startCleanupTimer() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, NOTIFICATION_SERVICE_CONFIG.CLEANUP_INTERVAL_MS);

    logNotificationState('cleanup_started', `Cleanup timer started (${NOTIFICATION_SERVICE_CONFIG.CLEANUP_INTERVAL_MS}ms interval)`);
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logNotificationState('cleanup_stopped', 'Cleanup timer stopped');
    }
  }

  /**
   * Perform cleanup by removing expired notifications
   */
  performCleanup() {
    let totalRemoved = 0;
    let keysToDelete = [];

    for (const [key, notifications] of this.recentNotifications.entries()) {
      const validNotifications = this._filterExpiredNotifications(notifications);

      if (validNotifications.length === 0) {
        keysToDelete.push(key);
      } else if (validNotifications.length !== notifications.length) {
        this.recentNotifications.set(key, validNotifications);
        totalRemoved += (notifications.length - validNotifications.length);
      }
    }

    // Remove empty keys
    keysToDelete.forEach(key => this.recentNotifications.delete(key));
    totalRemoved += keysToDelete.length;

    if (totalRemoved > 0) {
      logNotificationState('cleanup_completed', `Cleaned up ${totalRemoved} expired notification records`);
    }
  }

  /**
   * Filter out expired notifications
   * @param {Array} notifications - Array of notification records
   * @returns {Array} Valid notifications only
   */
  _filterExpiredNotifications(notifications) {
    const now = Date.now();
    return notifications.filter(
      notification => (now - notification.timestamp) < this.deduplicationWindow
    );
  }

  /**
   * Get statistics about current notification state
   * @returns {Object} Notification state statistics
   */
  getStatistics() {
    let totalNotifications = 0;
    let totalKeys = 0;

    for (const [key, notifications] of this.recentNotifications.entries()) {
      totalKeys++;
      totalNotifications += notifications.length;
    }

    return {
      totalKeys,
      totalNotifications,
      maxRecentNotifications: this.maxRecentNotifications,
      deduplicationWindow: this.deduplicationWindow,
      cleanupInterval: NOTIFICATION_SERVICE_CONFIG.CLEANUP_INTERVAL_MS
    };
  }

  /**
   * Clear all notification records (for testing/reset)
   */
  clearAllRecords() {
    const previousKeys = this.recentNotifications.size;
    this.recentNotifications.clear();
    logNotificationState('cleared', `Cleared all notification records (${previousKeys} keys)`);
  }

  /**
   * Get recent notifications for a specific key
   * @param {string} notificationKey - Notification key to query
   * @returns {Array} Recent notifications for the key
   */
  getRecentNotifications(notificationKey) {
    return this.recentNotifications.get(notificationKey) || [];
  }

  /**
   * Check if a notification type should be rate limited
   * @param {string} type - Notification type
   * @param {string} severity - Notification severity
   * @returns {boolean} Whether notification should be rate limited
   */
  shouldRateLimit(type, severity) {
    // Basic rate limiting logic - can be extended
    const severityLimits = {
      'critical': 1000 * 30, // 30 seconds for critical
      'high': 1000 * 60,    // 1 minute for high
      'medium': 1000 * 120, // 2 minutes for medium
      'low': this.deduplicationWindow
    };

    const limit = severityLimits[severity] || this.deduplicationWindow;
    return limit > this.deduplicationWindow;
  }
}

// Create notification template helpers
export class NotificationTemplateHelpers {
  /**
   * Get severity color for notifications
   * @param {string} severity - Severity level
   * @returns {string} Color code
   */
  static getSeverityColor(severity) {
    const colors = {
      'critical': '#dc3545',
      'high': '#fd7e14',
      'medium': '#ffc107',
      'low': '#28a745',
      'info': '#17a2b8'
    };
    return colors[severity] || colors['info'];
  }

  /**
   * Get notification category from severity
   * @param {string} severity - Severity level
   * @returns {string} Notification category
   */
  static getNotificationCategory(severity) {
    const categoryMap = {
      'critical': 'alerts',
      'high': 'alerts',
      'medium': 'updates',
      'low': 'info',
      'info': 'info'
    };
    return categoryMap[severity] || 'updates';
  }

  /**
   * Sanitize notification message content
   * @param {string} content - Raw content
   * @returns {string} Sanitized content
   */
  static sanitizeContent(content) {
    if (typeof content !== 'string') return '';

    // Basic sanitization - can be extended
    return content
      .replace(/[<>]/g, '') // Remove potential HTML/XML tags
      .trim()
      .substring(0, 500); // Limit length
  }
}

// Export singleton instance
export const notificationStateManager = new NotificationStateManager();
export default notificationStateManager;
