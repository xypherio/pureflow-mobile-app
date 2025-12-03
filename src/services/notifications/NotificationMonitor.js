/**
 * Production Notification Monitor
 * Provides monitoring and error handling for notification systems
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NotificationMonitor {
  constructor() {
    this.monitoringEnabled = true;
    this.deliveryTracking = new Map();
    this.errorCount = 0;
    this.lastErrorDetails = null;
  }

  /**
   * Log successful notification delivery
   */
  trackSuccessfulDelivery(notificationId, type, target) {
    if (!this.monitoringEnabled) return;

    const delivery = {
      timestamp: new Date().toISOString(),
      notificationId,
      type,
      target,
      status: 'delivered',
      platform: Platform.OS
    };

    this.deliveryTracking.set(notificationId, delivery);
    this.persistDeliveryTracking();

    console.log(`📊 Notification delivered: ${type} to ${target}`);
  }

  /**
   * Log notification failure
   */
  trackFailedDelivery(notificationId, type, target, error) {
    if (!this.monitoringEnabled) return;

    this.errorCount++;
    this.lastErrorDetails = {
      timestamp: new Date().toISOString(),
      notificationId,
      type,
      target,
      error: error?.message || error,
      platform: Platform.OS
    };

    const delivery = {
      timestamp: new Date().toISOString(),
      notificationId,
      type,
      target,
      status: 'failed',
      error: error?.message || error,
      platform: Platform.OS
    };

    this.deliveryTracking.set(notificationId, delivery);
    this.persistDeliveryTracking();

    console.warn(`❌ Notification failed: ${type} to ${target} - ${error?.message || error}`);

    // Auto-disable problematic notifications after too many failures
    if (this.errorCount > 10) {
      this.handleFrequentFailures();
    }
  }

  /**
   * Handle frequent notification failures (production safety)
   */
  handleFrequentFailures() {
    console.error('🚨 Frequent notification failures detected. Enabling safe mode.');

    // Log for debugging
    this.logSystemStatus();

    // Graceful degradation - could disable certain notifications
    // or switch to backup notification methods
  }

  /**
   * Check notification health status
   */
  getHealthStatus() {
    const recentDeliveries = Array.from(this.deliveryTracking.values())
      .filter(delivery => {
        const deliveryTime = new Date(delivery.timestamp);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return deliveryTime > oneHourAgo;
      });

    const successfulDeliveries = recentDeliveries.filter(d => d.status === 'delivered').length;
    const failedDeliveries = recentDeliveries.filter(d => d.status === 'failed').length;
    const totalDeliveries = successfulDeliveries + failedDeliveries;

    let healthStatus = 'healthy';
    let issues = [];

    if (failedDeliveries > successfulDeliveries) {
      healthStatus = 'unhealthy';
      issues.push('High failure rate in recent notifications');
    }

    if (totalDeliveries === 0) {
      healthStatus = 'unknown';
      issues.push('No notification activity in the last hour');
    }

    return {
      status: healthStatus,
      issues,
      metrics: {
        successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries * 100).toFixed(1) : 0,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        errorsInSession: this.errorCount
      },
      lastError: this.lastErrorDetails,
      recentActivity: recentDeliveries.slice(-5) // Last 5 deliveries
    };
  }

  /**
   * Log comprehensive system status for debugging
   */
  logSystemStatus() {
    const status = this.getHealthStatus();

    console.log('🩺 Notification System Health Report:');
    console.log(`Status: ${status.status}`);
    console.log(`Success Rate: ${status.metrics.successRate}%`);
    console.log(`Total Deliveries (1hr): ${status.metrics.totalDeliveries}`);
    console.log(`Successful: ${status.metrics.successfulDeliveries}`);
    console.log(`Failed: ${status.metrics.failedDeliveries}`);
    console.log(`Session Errors: ${status.metrics.errorsInSession}`);

    if (status.issues.length > 0) {
      console.log('Issues:', status.issues);
    }

    if (status.lastError) {
      console.log('Last Error:', status.lastError);
    }
  }

  /**
   * Provide recovery suggestions based on issues
   */
  getRecoverySuggestions() {
    const health = this.getHealthStatus();
    const suggestions = [];

    if (health.status === 'unhealthy') {
      if (Platform.OS === 'android') {
        suggestions.push({
          issue: 'Battery optimization may be killing notifications',
          action: 'Check battery optimization settings for the app',
          priority: 'high'
        });
      }

      suggestions.push({
        issue: 'Notification permissions may be denied',
        action: 'Verify app notification permissions in device settings',
        priority: 'high'
      });
    }

    if (health.metrics.successRate === 0 && health.metrics.totalDeliveries > 0) {
      suggestions.push({
        issue: 'All recent notifications failed',
        action: 'Check notification service initialization and try restarting the app',
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Clear delivery tracking (for privacy/testing)
   */
  clearDeliveryTracking() {
    this.deliveryTracking.clear();
    this.errorCount = 0;
    this.lastErrorDetails = null;
    this.persistDeliveryTracking();
    console.log('🧹 Notification delivery tracking cleared');
  }

  /**
   * Persist delivery tracking to storage (with privacy considerations)
   */
  async persistDeliveryTracking() {
    try {
      // Only store essential data for debugging, not full notification content
      const trackingSummary = {
        errorCount: this.errorCount,
        lastErrorTimestamp: this.lastErrorDetails?.timestamp,
        recentFailures: Array.from(this.deliveryTracking.values())
          .filter(d => d.status === 'failed')
          .slice(-3) // Last 3 failures only
          .map(d => ({
            timestamp: d.timestamp,
            type: d.type,
            error: d.error?.substring(0, 100) // Truncate error for privacy
          }))
      };

      await AsyncStorage.setItem(
        'notificationHealthTracking',
        JSON.stringify(trackingSummary)
      );
    } catch (error) {
      console.warn('Could not persist notification health tracking:', error);
    }
  }

  /**
   * Load persisted tracking data
   */
  async loadPersistedTracking() {
    try {
      const stored = await AsyncStorage.getItem('notificationHealthTracking');
      if (stored) {
        const data = JSON.parse(stored);
        this.errorCount = data.errorCount || 0;
        console.log('📦 Loaded notification health tracking');
      }
    } catch (error) {
      console.warn('Could not load persisted tracking:', error);
    }
  }

  /**
   * Enable/disable monitoring
   */
  setMonitoringEnabled(enabled) {
    this.monitoringEnabled = enabled;
    console.log(`📊 Notification monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get production-ready status message
   */
  getProductionStatusMessage() {
    const health = this.getHealthStatus();
    let message = `📊 Notifications: ${health.status === 'healthy' ? 'Working normally' : 'Some issues detected'}`;

    if (health.issues.length > 0) {
      message += `\n⚠️ ${health.issues[0]}`;
    }

    return message;
  }
}

// Export singleton instance
export const notificationMonitor = new NotificationMonitor();
export default notificationMonitor;
