import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FCM Service for sending notifications to FCM server
 * Handles communication with the external FCM server for push notifications
 */

class FCMService {
  constructor() {
    this.serverUrl = process.env.EXPO_PUBLIC_FCM_SERVER_URL || 'http://localhost:3001';
    this.apiKey = process.env.EXPO_PUBLIC_FCM_API_KEY || 'dev-key';
    this.isInitialized = false;

    // Simple cache for recent requests to avoid duplicates
    this.requestCache = new Map();
  }

  /**
   * Initialize FCM service
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔗 Initializing FCM service...');
    console.log('📡 FCM Server:', this.serverUrl);

    // Load stored FCM tokens
    await this.loadStoredTokens();
    this.isInitialized = true;

    console.log('✅ FCM service initialized');
  }

  /**
   * Load stored FCM tokens from AsyncStorage
   */
  async loadStoredTokens() {
    try {
      const stored = await AsyncStorage.getItem('fcm_registration_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.registeredTokens = data.tokens || [];
        console.log('📦 Loaded', this.registeredTokens.length, 'FCM tokens');
      } else {
        this.registeredTokens = [];
      }
    } catch (error) {
      console.error('❌ Error loading FCM tokens:', error);
      this.registeredTokens = [];
    }
  }

  /**
   * Register FCM token with the server (for future broadcasting)
   */
  async registerToken(fcmToken, userData = {}) {
    try {
      if (!fcmToken) throw new Error('FCM token required');

      const response = await fetch(`${this.serverUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          fcmToken,
          userData: {
            deviceId: userData.deviceId,
            userId: userData.userId,
            appVersion: userData.appVersion,
            platform: userData.platform,
            registeredAt: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        // Store locally for backup/fallback
        this.registeredTokens.push(fcmToken);
        await AsyncStorage.setItem('fcm_registration_data', JSON.stringify({
          tokens: this.registeredTokens,
          lastRegistration: new Date().toISOString()
        }));

        console.log('✅ FCM token registered with server');
        return { success: true };
      } else {
        console.warn('⚠️ FCM token registration failed:', result.message);
        return { success: false, error: result.message };
      }

    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
      // Don't fail the registration since it's not critical
      return { success: false, error: error.message, isNetworkError: true };
    }
  }

  /**
   * Send water quality alert to FCM server
   */
  async sendWaterQualityAlert(fcmToken, sensorData, options = {}) {
    return this._sendRequest('/alert', {
      fcmToken,
      sensorData: {
        ...sensorData,
        ...options // Allow overriding sensor data
      }
    });
  }

  /**
   * Send maintenance reminder to FCM server
   */
  async sendMaintenanceReminder(fcmToken, reminderData, options = {}) {
    return this._sendRequest('/maintenance', {
      fcmToken,
      reminderData: {
        ...reminderData,
        ...options
      }
    });
  }

  /**
   * Send forecast alert to FCM server
   */
  async sendForecastAlert(fcmToken, forecastData, options = {}) {
    return this._sendRequest('/forecast', {
      fcmToken,
      forecastData: {
        ...forecastData,
        ...options
      }
    });
  }

  /**
   * Send custom notification to FCM server
   */
  async sendCustomNotification(fcmToken, notificationData, options = {}) {
    return this._sendRequest('/custom', {
      fcmToken,
      customData: {
        ...notificationData,
        ...options
      }
    });
  }

  /**
   * Send generic notification to FCM server
   */
  async sendGenericNotification(fcmToken, title, body, options = {}) {
    return this._sendRequest('/send', {
      fcmToken,
      title,
      body,
      data: {
        type: 'generic',
        timestamp: new Date().toISOString(),
        ...options
      }
    });
  }

  /**
   * Broadcast notification to all registered devices (if server supports)
   */
  async broadcastNotification(title, body, data = {}) {
    try {
      const response = await fetch(`${this.serverUrl}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          title,
          body,
          data,
          broadcast: true
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('📢 Broadcast notification sent successfully');
        return { success: true, count: result.count };
      } else {
        console.warn('⚠️ Broadcast notification failed:', result.message);
        return { success: false, error: result.message };
      }

    } catch (error) {
      console.error('❌ Error broadcasting notification:', error);
      return { success: false, error: error.message, isNetworkError: true };
    }
  }

  /**
   * Private method to handle HTTP requests to FCM server
   */
  async _sendRequest(endpoint, payload) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Create cache key to prevent duplicate requests in short timeframe
      const cacheKey = `${endpoint}-${JSON.stringify(payload).slice(0, 100)}`;
      if (this.requestCache.has(cacheKey)) {
        console.log('🔄 FCM request cached, skipping duplicate');
        return { success: true, cached: true };
      }

      console.log('📤 Sending to FCM server:', endpoint, payload.fcmToken ? '[TOKEN]' : '');

      const response = await fetch(`${this.serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': 'PureFlowMobile/1.0'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Cache successful request for 30 seconds
        this.requestCache.set(cacheKey, Date.now());
        setTimeout(() => this.requestCache.delete(cacheKey), 30000);

        console.log('✅ FCM notification sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } else {
        console.warn('⚠️ FCM server request failed:', result.message || result.error);
        return { success: false, error: result.message || result.error };
      }

    } catch (error) {
      console.error('❌ FCM network error:', error.message);

      // Log network issues but don't fail critically
      return {
        success: false,
        error: error.message,
        isNetworkError: true,
        fallbackSuggested: true // Suggest fallback to local notification
      };
    }
  }

  /**
   * Test FCM server connectivity
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.serverUrl}`, { timeout: 5000 });
      const result = await response.json();

      if (result.status === 'healthy') {
        console.log('✅ FCM server connection successful');
        return { success: true, server: result };
      } else {
        console.warn('⚠️ FCM server unhealthy:', result);
        return { success: false, error: 'Server unhealthy' };
      }
    } catch (error) {
      console.error('❌ FCM server connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get FCM service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      serverUrl: this.serverUrl,
      apiKeyConfigured: !!this.apiKey,
      registeredTokens: this.registeredTokens?.length || 0,
      cacheSize: this.requestCache.size
    };
  }

  /**
   * Clear request cache (for debugging/testing)
   */
  clearCache() {
    this.requestCache.clear();
    console.log('🧹 FCM request cache cleared');
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;
