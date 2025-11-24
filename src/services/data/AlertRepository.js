import { addAlertToFirestore } from '@services/firebase/firestore.js';
import { fetchAllDocuments } from '@services/firebase/firestore.js';

export class AlertRepository {
  constructor() {
    this.collectionName = 'alerts';
    
    // Bind methods to ensure 'this' context is preserved
    this.normalizeAlert = this.normalizeAlert.bind(this);
    this.parseTimestamp = this.parseTimestamp.bind(this);
    this.saveAlert = this.saveAlert.bind(this);
    this.saveAlerts = this.saveAlerts.bind(this);
    this.getAlerts = this.getAlerts.bind(this);
    this.getActiveAlerts = this.getActiveAlerts.bind(this);
  }

  async saveAlert(alert) {
    try {
      await addAlertToFirestore([alert]);
      console.log('✅ Alert saved to Firebase:', alert.id);
      return { success: true, id: alert.id };
    } catch (error) {
      console.error('❌ Error saving alert:', error);
      throw error;
    }
  }

  async saveAlerts(alerts) {
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return { success: true, saved: 0 };
    }

    try {
      await addAlertToFirestore(alerts);
      console.log(`✅ Saved ${alerts.length} alerts to Firebase`);
      return { success: true, saved: alerts.length };
    } catch (error) {
      console.error('❌ Error saving alerts:', error);
      throw error;
    }
  }

  async getAlerts(options = {}) {
    const {
      limitCount = 20,
      orderByField = 'timestamp',
      orderDirection = 'desc',
      filterType = null,
      filterSeverity = null
    } = options;

    try {
      let alerts = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount,
        orderByField,
        orderDirection
      });

      // Apply filters
      if (filterType && filterType !== 'all') {
        alerts = alerts.filter(alert => 
          alert.type && alert.type.toLowerCase() === filterType.toLowerCase()
        );
      }

      if (filterSeverity && filterSeverity !== 'all') {
        alerts = alerts.filter(alert => 
          alert.severity && alert.severity.toLowerCase() === filterSeverity.toLowerCase()
        );
      }

      return alerts.map(this.normalizeAlert);
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      throw error;
    }
  }

  async getActiveAlerts() {
    // In a real implementation, you might have an 'active' field
    // For now, we'll consider recent alerts as active
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const alerts = await this.getAlerts({ limitCount: 20 });
    return alerts.filter(alert => {
      const alertTime = this.parseTimestamp(alert.timestamp);
      return alertTime >= oneDayAgo;
    });
  }

  normalizeAlert(rawAlert) {
    return {
      id: rawAlert.id,
      type: rawAlert.type || 'info',
      title: rawAlert.title || 'Unknown Alert',
      message: rawAlert.message || rawAlert.title || 'No message available',
      parameter: rawAlert.parameter || 'Unknown',
      severity: rawAlert.severity || 'low',
      value: rawAlert.value,
      threshold: rawAlert.threshold,
      timestamp: this.parseTimestamp(rawAlert.timestamp || rawAlert.createdAt),
      createdAt: rawAlert.createdAt,
      occurrenceCount: rawAlert.occurrenceCount || 1,
      isWarning: rawAlert.isWarning ?? false
    };
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return new Date();

    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    if (typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }

    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      // Only return the date if it's valid and reasonable (not before 2020 or after 2030)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        if (year >= 2020 && year <= 2030) {
          return date;
        }
      }
    }

    // Fallback to current time for invalid timestamps
    console.warn('⚠️ Using current timestamp for invalid alert timestamp:', timestamp);
    return new Date();
  }
}
