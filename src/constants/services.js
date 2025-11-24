// Service Layer Constants
// Shared constants for service layer operations

// Historical Alerts Service Constants
export const HISTORICAL_ALERTS_CONFIG = {
  CACHE_DURATION_MS: 60 * 1000, // 1 minute cache
  DEFAULT_LIMIT_COUNT: 100, // Default alerts per fetch
  MAX_LIMIT_COUNT: 1000, // Maximum alerts per fetch
  TIMEFRAME_MAPPING: {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Annual'
  },
  SECTIONS: {
    TODAY: 'Today',
    YESTERDAY: 'Yesterday',
    THIS_WEEK: 'This Week',
    OLDER: 'Older'
  },
  // Timestamp validation
  VALID_TIMESTAMP_YEARS: {
    MIN: 2020,
    MAX: 2030
  }
};

// Historical Data Service Constants
export const HISTORICAL_DATA_CONFIG = {
  CACHE_EXPIRY_HOURS: 24, // 24 hours cache
  AGGREGATION_INTERVALS: {
    HOURLY: '2h',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ANNUAL: 'annually'
  },
  DATA_VALIDATION_RANGES: {
    PH: { min: 0, max: 14, precision: 2 },
    TEMPERATURE: { min: -10, max: 60, precision: 1 },
    TURBIDITY: { min: 0, max: 1000, precision: 0 },
    SALINITY: { min: 0, max: 100, precision: 2 }
  },
  TIMEZONE_OFFSET_DEFAULT: 0, // UTC
  BATCH_SIZE_MAX: 1000, // Maximum batch size for processing
  MEMORY_LIMIT_MB: 100 // Rough memory limit for data processing
};

// Service Container Constants
export const SERVICE_CONTAINER_CONFIG = {
  INITIALIZATION_TIMEOUT_MS: 30000, // 30 second timeout
  CACHE_MAINTENANCE_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
  HEALTH_CHECK_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_INITIALIZATION_ATTEMPTS: 3, // Maximum initialization retries
  SERVICE_STATUSES: {
    INITIALIZING: 'initializing',
    HEALTHY: 'healthy',
    WARNING: 'warning',
    CRITICAL: 'critical',
    UNAVAILABLE: 'unavailable'
  },
  INITIALIZATION_PHASES: {
    CORE_SERVICES: 'core_services',
    DATA_SERVICES: 'data_services',
    CACHING_SERVICES: 'caching_services',
    NOTIFICATION_SERVICES: 'notification_services',
    PROCESSING_SERVICES: 'processing_services',
    FACADE_SERVICES: 'facade_services',
    MONITORING_SETUP: 'monitoring_setup',
    LEGACY_ADAPTERS: 'legacy_adapters',
    POST_INITIALIZATION: 'post_initialization'
  }
};

// Water Quality Notification Service Constants
export const NOTIFICATION_SERVICE_CONFIG = {
  DEDUPLICATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute cleanup
  MAX_RECENT_NOTIFICATIONS: 10, // Max recent notifications per key
  MAX_NOTIFICATION_RETRIES: 3,
  NOTIFICATION_CATEGORIES: {
    WATER_QUALITY: 'water_quality_alert',
    DEVICE_STATUS: 'device_status',
    SYSTEM_HEALTH: 'system_health',
    MAINTENANCE: 'maintenance_reminder',
    CALIBRATION: 'calibration_reminder',
    DATA_SYNC: 'data_sync',
    FORECAST: 'forecast_alert'
  },
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    WARNING: 'warning',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
};

// Weather Service Constants
export const WEATHER_CONFIG = {
  CACHE_DURATION_MS: 10 * 60 * 1000, // 10 minutes cache
  DEFAULT_CITY: 'Cebu City',
  DEFAULT_API_KEY: null, // Will be set via environment variables
  UNITS: 'metric', // Celsius and km/h
  WEATHER_ICON_MAPPING: {
    // Thunderstorm group (200-232)
    thunderstorm: ['200', '201', '202', '210', '211', '212', '221', '230', '231', '232'],
    // Drizzle group (300-321) - but we'll treat as rain
    drizzle: [],
    // Rain group (500-531)
    rain: ['300', '301', '302', '310', '311', '312', '313', '314', '321',
           '500', '501', '502', '503', '504', '511', '520', '521', '522', '531'],
    // Snow group (600-622) - fallback to partly
    snow: [],
    // Atmosphere group (700-781) - various conditions
    atmosphere: ['701', '711', '721', '731', '741', '751', '761', '762', '771', '781'],
    // Clear sky (800)
    clear: ['800'],
    // Clouds (801-804)
    clouds: ['801', '802', '803', '804']
  },
  // Icon names that match the app's icon system
  ICON_NAMES: {
    rain: 'rain',
    sunny: 'sunny',
    partly: 'partly',
    unknown: 'partly' // fallback
  },
  // Timeout and retry settings
  REQUEST_TIMEOUT_MS: 10000, // 10 seconds
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000 // 1 second
};

// Optimized Data Manager Constants
export const OPTIMIZED_DATA_MANAGER_CONFIG = {
  INITIAL_FETCH_TIMEOUT_MS: 15000, // 15 seconds for initial load
  INCREMENTAL_UPDATE_INTERVAL_MS: 30 * 1000, // 30 seconds
  MAX_CHART_POINTS: 100, // Maximum points in chart data
  DATA_AGE_WARNING_THRESHOLD_HOURS: 2, // Warn if data older than 2 hours
  CACHE_KEY_PREFIX: 'optimized_data_',
  SUBSCRIBER_UPDATE_BATCH_SIZE: 50 // Max subscribers to notify per batch
};

// Realtime Data Service Constants
export const REALTIME_DATA_CONFIG = {
  DEFAULT_LIMIT: 1, // Most recent record
  LISTENER_RECONNECT_ATTEMPTS: 3,
  LISTENER_RECONNECT_DELAY_MS: 5000, // 5 seconds
  DATA_NORMALIZATION_TIMEOUT_MS: 5000, // 5 seconds timeout
  CACHE_TTL_DEFAULT_MS: 30 * 1000, // 30 seconds
  MAX_CONCURRENT_REQUESTS: 3, // Limit concurrent fetches
  QUERY_BATCH_SIZE: 10 // Firebase pagination size
};

// Suggestion Engine Constants
export const SUGGESTION_ENGINE_CONFIG = {
  CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
  THRESHOLDS: {
    PH_CRITICAL_LOW: 6.5,
    PH_CRITICAL_HIGH: 8.5,
    TURBIDITY_WARNING: 5,
    TEMPERATURE_WARNING: 30,
    RAIN_INDICATOR: 1 // isRaining value for rain detection
  },
  PRIORITY_SCORES: {
    CRITICAL: 100,
    WARNING: 60,
    INFO: 30,
    POSITIVE: 10
  }
};

// Performance Monitor (Service Version) Constants
export const PERFORMANCE_MONITOR_CONFIG = {
  DEFAULT_BASELINE_METRICS: {
    methodCalls: 0,
    errors: 0,
    averageResponseTime: 0
  },
  METRICS_RETENTION_HOURS: 24,
  SLOW_OPERATION_THRESHOLD_MS: 1000, // Operations over 1 second
  MEMORY_WARNING_THRESHOLD_MB: 50,
  ALERT_THRESHOLDS: {
    ERROR_RATE_PCT: 5, // Alert if >5% error rate
    SLOW_OPERATIONS_PCT: 10 // Alert if >10% operations are slow
  }
};

// Logging Configuration for Services
export const SERVICE_LOGGING_CONFIG = {
  ENABLE_DETAILED_LOGGING: false, // Set to true for detailed debugging
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  CURRENT_LEVEL: 2, // Default to INFO level
  COMPONENTS: {
    ALERTS_SERVICE: 'HistoricalAlertsService',
    DATA_SERVICE: 'HistoricalDataService',
    NOTIFICATION_SERVICE: 'WaterQualityNotificationService',
    WEATHER_SERVICE: 'WeatherService',
    REALTIME_SERVICE: 'RealtimeDataService',
    OPTIMIZED_MANAGER: 'OptimizedDataManager',
    SERVICE_CONTAINER: 'ServiceContainer'
  },
  // Sensitive data patterns to mask in logs
  SENSITIVE_PATTERNS: [
    /api[_-]?key[s]?/i,
    /token[s]?/i,
    /password[s]?/i,
    /secret[s]?/i
  ]
};

// Data Transformation Patterns
export const DATA_TRANSFORMATION_CONFIG = {
  TIMESTAMP_FORMATS: {
    FIREBASE: "Month DD, YYYY at HH:MM:SS AM/PM UTC+X",
    ISO: "YYYY-MM-DDTHH:mm:ss.sssZ",
    UNIX: "number"
  },
  PARAMETER_MAPPINGS: {
    'pH': ['pH', 'ph', 'PH'],
    'temperature': ['temperature', 'temp', 'Temperature', 'Temp'],
    'turbidity': ['turbidity', 'Turbidity'],
    'salinity': ['salinity', 'Salinity']
  },
  DEFAULT_VALUES: {
    PH: null,
    TEMPERATURE: null,
    TURBIDITY: null,
    SALINITY: null,
    TIMESTAMP: () => new Date(),
    IS_RAINING: false
  }
};

// API and External Service Constants
export const EXTERNAL_SERVICES_CONFIG = {
  FIREBASE: {
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },
  OPENWEATHER: {
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    REQUEST_TIMEOUT_MS: 10000,
    CACHE_DURATION_MS: 10 * 60 * 1000, // 10 minutes
    DEFAULT_UNITS: 'metric'
  },
  // Placeholder for other APIs
  TELEMETRY: {
    SEND_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    RETRY_ATTEMPTS: 2
  }
};

// AsyncStorage Keys
export const STORAGE_KEYS = {
  // Cache keys
  HISTORICAL_ALERTS_CACHE: 'historical_alerts_cache',
  HISTORICAL_DATA_CACHE: 'historical_data_cache',
  WEATHER_CACHE: 'weather_cache',

  // Configuration keys
  SERVICE_HEALTH_STATUS: 'service_health_status',
  NOTIFICATION_SETTINGS: 'notification_settings',

  // Debug and maintenance keys
  LAST_CACHE_CLEANUP: 'last_cache_cleanup',
  PERFORMANCE_METRICS: 'performance_metrics'
};

// Error Messages and Codes for Services
export const SERVICE_ERRORS = {
  // Common errors
  INITIALIZATION_FAILED: 'Service initialization failed',
  INVALID_CONFIGURATION: 'Invalid service configuration',
  DEPENDENCY_MISSING: 'Required service dependency not available',
  TIMEOUT_ERROR: 'Operation timed out',
  NETWORK_ERROR: 'Network communication failed',

  // Specific service errors
  ALERTS_FETCH_FAILED: 'Failed to fetch historical alerts',
  DATA_AGGREGATION_FAILED: 'Data aggregation operation failed',
  NOTIFICATION_SEND_FAILED: 'Failed to send notification',
  WEATHER_API_FAILED: 'Weather API request failed',
  CACHE_OPERATION_FAILED: 'Cache operation failed',

  // Validation errors
  INVALID_PARAMETERS: 'Invalid method parameters',
  DATA_VALIDATION_FAILED: 'Data validation failed',
  TIMESTAMP_PARSING_FAILED: 'Failed to parse timestamp',

  // Usage errors
  RATE_LIMIT_EXCEEDED: 'Service rate limit exceeded',
  QUOTA_EXCEEDED: 'Service quota exceeded',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
};
