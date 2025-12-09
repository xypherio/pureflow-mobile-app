const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Provide API key in x-api-key header or Authorization header'
    });
  }

  // Support either API_SECRET_KEY (server) or EXPO_PUBLIC_FCM_API_KEY (from .env for local/dev)
  const allowedApiKey = process.env.API_SECRET_KEY || process.env.EXPO_PUBLIC_FCM_API_KEY;
  if (!allowedApiKey) {
    console.warn('API key not configured. Set API_SECRET_KEY or EXPO_PUBLIC_FCM_API_KEY in environment.');
    return res.status(500).json({ success: false, error: 'Server config error', message: 'Set API_SECRET_KEY or EXPO_PUBLIC_FCM_API_KEY in server environment' });
  } else {
    // For debugging clarity, log which env var is being used (only in development)
    if (process.env.NODE_ENV === 'development') {
      const used = process.env.API_SECRET_KEY ? 'API_SECRET_KEY' : 'EXPO_PUBLIC_FCM_API_KEY';
      console.log(`Using API key from env var: ${used}`);
    }
  }

  try {
    const apiKeyBuf = Buffer.from(apiKey);
    const allowedBuf = Buffer.from(allowedApiKey);

    // timingSafeEqual throws if buffers have different lengths — check length first
    if (apiKeyBuf.length !== allowedBuf.length || !crypto.timingSafeEqual(apiKeyBuf, allowedBuf)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'API key is not valid'
      });
    }
  } catch (err) {
    console.warn('API key validation error:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid API key', message: 'API key is not valid' });
  }

  next();
}

function corsMiddleware(req, res, next) {
  // Allow all origins for FCM server (adjust for production to restrict domains)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ||
    ['http://localhost:3000', 'http://localhost:8081', 'exp://*', 'pureflow://'];

  const origin = req.headers.origin;

  // Allow requests from React Native apps and web apps
  if (!origin || allowedOrigins.includes(origin) || origin.match(/^exp:\/\/|^pureflow:|^http:\/\/192\.168\./) || origin === '*') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, User-Agent');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many requests. Wait before sending more notifications.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const broadcastRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Broadcast rate limit exceeded',
    message: 'Too many broadcast requests. Wait 5 minutes.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function requestLogger(req, res, next) {
  const start = Date.now();
  console.log(`📨 ${req.method} ${req.path} - IP: ${req.ip}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const icon = status >= 200 && status < 300 ? '✅' : status >= 400 ? '⚠️' : '❌';
    console.log(`${icon} ${req.method} ${req.path} - ${status} - ${duration}ms`);
  });

  next();
}

function validateNotificationRequest(req, res, next) {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing FCM token',
      message: 'fcmToken required in request body'
    });
  }

  // Accept any non-empty string token. Token lengths vary across providers
  if (typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid FCM token',
      message: 'fcmToken must be a non-empty string'
    });
  }

  next();
}

function validateWaterQualityAlert(req, res, next) {
  const { sensorData } = req.body;

  if (!sensorData) {
    return res.status(400).json({
      success: false,
      error: 'Missing sensor data',
      message: 'sensorData object required'
    });
  }

  const { parameter, value, threshold } = sensorData;

  if (!parameter) {
    return res.status(400).json({
      success: false,
      error: 'Missing parameter',
      message: 'sensorData.parameter required'
    });
  }

  if (typeof value !== 'number' || typeof threshold !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Invalid values',
      message: 'sensorData.value and threshold must be numbers'
    });
  }

  next();
}

function errorHandler(err, req, res, next) {
  console.error('❌ Server Error:', err);
  console.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Unexpected error occurred'
  });
}

function requireGet(req, res, next) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Endpoint only accepts GET requests'
    });
  }
  next();
}

module.exports = {
  authenticateApiKey,
  corsMiddleware,
  notificationRateLimit,
  broadcastRateLimit,
  requestLogger,
  validateNotificationRequest,
  validateWaterQualityAlert,
  errorHandler,
  requireGet
};
