// Load environment variables from .env in development
try {
  require('dotenv').config();
} catch (err) {
  // dotenv may not be installed or available; ignore if not
}

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

const { initializeFirebase, checkFirebaseHealth } = require('../lib/firebase-admin');
const { sendNotification, sendWaterQualityAlert, sendMaintenanceReminder, sendForecastAlert, sendCustomNotification } = require('../lib/notification-service');
const { authenticateApiKey, corsMiddleware, notificationRateLimit, broadcastRateLimit, requestLogger, validateNotificationRequest, validateWaterQualityAlert, errorHandler } = require('../lib/middleware');
const { addOrUpdateToken } = require('../lib/token-store');

const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(requestLogger);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);

// Initialize Firebase
(async () => {
  try {
    initializeFirebase();
    console.log('🚀 FCM Server initialized');
  } catch (error) {
    console.error('❌ FCM init failed:', error.message);
    process.exit(1);
  }
})();

/**
 * Health Check Endpoint
 * GET /api
 */
app.get('/', async (req, res) => {
  try {
    const firebaseStatus = await checkFirebaseHealth();

    const healthStatus = {
      status: 'healthy',
      service: 'PureFlow FCM Server',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      firebase: firebaseStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      ...healthStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * Send Generic FCM Notification
 * POST /api/send
 */
app.post('/send', [
  authenticateApiKey,
  notificationRateLimit,
  validateNotificationRequest
], async (req, res) => {
  try {
    const { fcmToken, title, body, data = {}, priority = 'normal', sound = 'default' } = req.body;

    const notification = {
      notification: {
        title: title || 'PureFlow Notification',
        body: body || ''
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        priority,
        notification: {
          channel_id: priority === 'high' ? 'alerts' : 'updates',
          sound: sound
        }
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound,
            'content-available': 1
          }
        }
      }
    };

    const result = await sendNotification(fcmToken, notification);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error in /send:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Send Water Quality Alert
 * POST /api/alert
 */
app.post('/alert', [
  authenticateApiKey,
  notificationRateLimit,
  validateNotificationRequest,
  validateWaterQualityAlert
], async (req, res) => {
  try {
    const { fcmToken, sensorData } = req.body;

    const result = await sendWaterQualityAlert(fcmToken, sensorData);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Water quality alert sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send water quality alert'
      });
    }
  } catch (error) {
    console.error('Error in /alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Send Maintenance Reminder
 * POST /api/maintenance
 */
app.post('/maintenance', [
  authenticateApiKey,
  notificationRateLimit,
  validateNotificationRequest
], async (req, res) => {
  try {
    const { fcmToken, reminderData } = req.body;

    const result = await sendMaintenanceReminder(fcmToken, reminderData);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Maintenance reminder sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send maintenance reminder'
      });
    }
  } catch (error) {
    console.error('Error in /maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Send Forecast Alert
 * POST /api/forecast
 */
app.post('/forecast', [
  authenticateApiKey,
  notificationRateLimit,
  validateNotificationRequest
], async (req, res) => {
  try {
    const { fcmToken, forecastData } = req.body;

    const result = await sendForecastAlert(fcmToken, forecastData);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Forecast alert sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send forecast alert'
      });
    }
  } catch (error) {
    console.error('Error in /forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Custom Notification
 * POST /api/custom
 */
app.post('/custom', [
  authenticateApiKey,
  notificationRateLimit,
  validateNotificationRequest
], async (req, res) => {
  try {
    const { fcmToken, customData } = req.body;

    const result = await sendCustomNotification(fcmToken, customData);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Custom notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send custom notification'
      });
    }
  } catch (error) {
    console.error('Error in /custom:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Register FCM Token (Stub implementation)
 * POST /api/register
 */
app.post('/register', [
  authenticateApiKey,
  notificationRateLimit
], async (req, res) => {
  try {
    const { fcmToken, userData = {} } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing FCM token',
        message: 'fcmToken required in request body'
      });
    }

    // Persist token to token store
    try {
      const saved = await addOrUpdateToken(fcmToken, { userId: userData.userId, platform: userData.platform, deviceInfo: userData.deviceInfo });
      console.log('📝 FCM token registered:', { tokenPrefix: fcmToken.substring(0, 10) + '...', userId: userData.userId, platform: userData.platform });

      res.json({
        success: true,
        message: 'FCM token registered successfully',
        token: saved.token,
        lastSeen: saved.lastSeen
      });
    } catch (err) {
      console.error('❌ Error saving token:', err.message);
      res.status(500).json({ success: false, error: 'Failed to persist token' });
    }
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Broadcast Notification (Stub implementation)
 * POST /api/broadcast
 */
app.post('/broadcast', [
  authenticateApiKey,
  broadcastRateLimit
], async (req, res) => {
  try {
    const { title = 'Broadcast', body = '', data = {} } = req.body;

    // TODO: Retrieve registered tokens from database and send to all
    console.log('📢 Broadcast requested but not implemented:', { title, body });

    res.json({
      success: true,
      message: 'Broadcast not implemented yet',
      recipientCount: 0
    });
  } catch (error) {
    console.error('Error in /broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Service Information
 * GET /api/info
 */
app.get('/info', (req, res) => {
  res.json({
    success: true,
    service: 'PureFlow FCM Server',
    version: '2.0.0',
    description: 'Firebase Cloud Messaging server for PureFlow water monitoring app',
    endpoints: [
      'GET /',
      'POST /send',
      'POST /alert',
      'POST /maintenance',
      'POST /forecast',
      'POST /custom',
      'POST /register',
      'POST /broadcast',
      'GET /info'
    ],
    supportedNotificationTypes: [
      'water_quality_alert',
      'maintenance_reminder',
      'forecast_alert',
      'custom_notification'
    ],
    notificationChannels: ['alerts', 'updates', 'maintenance', 'forecasts'],
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
const serverless = require('serverless-http');
module.exports = serverless(app);


// For local development
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🚀 FCM Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/`);
  });
}
