// Processing Services Constants
// Shared constants used across processing services

// Alert Processing Constants
export const ALERT_PROCESSING_CONFIG = {
  DEDUPLICATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  DEFAULT_ALERT_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  MAX_ALERTS_PER_BATCH: 100, // Maximum alerts to process in one batch
  CACHE_KEY_PREFIX: 'alert_processor_v2',
  METADATA_EXPIRY_MS: 60 * 60 * 1000 // 1 hour metadata cache
};

// Parameter Categories and Mappings
export const PARAMETER_CATEGORIES = {
  CHEMICAL: ['ph', 'salinity', 'tds'],
  PHYSICAL: ['temperature', 'turbidity'],
  BIOLOGICAL: ['dissolved_oxygen', 'nitrates', 'phosphates']
};

// Alert Severity and Priority Levels
export const ALERT_SEVERITY = {
  CRITICAL: { weight: 3, priority: 'high' },
  HIGH: { weight: 2, priority: 'high' },
  MEDIUM: { weight: 1.5, priority: 'medium' },
  LOW: { weight: 1, priority: 'low' }
};

// Alert Types and Statuses
export const ALERT_TYPES = {
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  TREND_WARNING: 'trend_warning',
  PARAMETER_SPIKE: 'parameter_spike',
  DEVICE_ANOMALY: 'device_anomaly',
  SYSTEM_WARNING: 'system_warning'
};

export const ALERT_STATUSES = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  ACKNOWLEDGED: 'acknowledged',
  EXPIRED: 'expired',
  SUPPRESSED: 'suppressed'
};

// Data Processing Constants
export const DATA_PROCESSING_CONFIG = {
  MAX_VALIDATION_ERRORS: 10,
  VALIDATION_TIMEOUT_MS: 30000,
  TRANSFORMATION_BATCH_SIZE: 100,
  PROCESSING_CONCURRENT_LIMIT: 3,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_STORAGE_SIZE: 1000 // Max items to keep in memory
};

// Processing Pipeline Stages
export const PIPELINE_STAGES = {
  VALIDATION: 'validation',
  CLEANING: 'cleaning',
  TRANSFORMATION: 'transformation',
  ENRICHMENT: 'enrichment',
  AGGREGATION: 'aggregation',
  STORAGE: 'storage'
};

// Numeric Field Validations
export const NUMERIC_FIELD_RANGES = {
  ph: { min: 0, max: 14, precision: 2 },
  temperature: { min: -50, max: 150, precision: 1 },
  turbidity: { min: 0, max: 10000, precision: 1 }, // High range for various NTU sensors
  salinity: { min: 0, max: 50, precision: 1 }, // ppt
  dissolved_oxygen: { min: 0, max: 20, precision: 1 },
  conductivity: { min: 0, max: 100000, precision: 0 }, // µS/cm
  tds: { min: 0, max: 50000, precision: 0 }, // ppm
  nitrates: { min: 0, max: 500, precision: 1 }, // mg/L
  phosphates: { min: 0, max: 50, precision: 1 } // mg/L
};

// Data Quality Thresholds
export const DATA_QUALITY_THRESHOLDS = {
  MIN_STAGE_COMPLETENESS: 0.8, // 80% of fields should have valid data
  MAX_OUTLIER_DEVIATION: 3, // 3 standard deviations from mean
  MIN_READING_FREQUENCY: 0.9, // 90% of expected readings present
  MAX_GAP_DURATION_MINUTES: 30 // Maximum gap between readings
};

// Forecast Processing Constants
export const FORECAST_CONFIG = {
  DEFAULT_TIMEFRAME: '6h',
  VALID_TIMEFRAMES: ['3h', '6h', '12h', '24h', '48h'],
  MODEL_CONFIDENCE_THRESHOLD: 0.7,
  DEFAULT_MODEL_TYPE: 'linear_regression',
  MAX_HISTORICAL_DAYS: 30,
  MIN_DATA_POINTS: 3,
  MAX_FORECAST_HORIZON_HOURS: 168 // 7 days
};

// Forecast Model Parameters
export const FORECAST_MODELS = {
  LINEAR_REGRESSION: {
    name: 'linear_regression',
    minPoints: 2,
    maxPoints: 1000,
    confidenceThreshold: 0.6
  },
  MOVING_AVERAGE: {
    name: 'moving_average',
    windowSize: 7,
    minPoints: 7,
    maxPoints: 500
  },
  EXPONENTIAL_SMOOTHING: {
    name: 'exponential_smoothing',
    alpha: 0.3,
    minPoints: 5,
    maxPoints: 1000
  }
};

// Standard Thresholds for Water Quality Parameters
export const WATER_QUALITY_THRESHOLDS = {
  ph: {
    ideal: [6.5, 8.5],
    acceptable: [6.0, 9.0],
    critical: [5.5, 9.5],
    early_warning: { high: 8.2, low: 6.8 }
  },
  temperature: {
    ideal: [25, 30], // Celsius
    acceptable: [20, 32],
    critical: [18, 35],
    early_warning: { high: 28, low: 22 }
  },
  turbidity: {
    ideal: [0, 5], // NTU
    acceptable: [0, 10],
    critical: [0, 20],
    early_warning: { high: 7 }
  },
  salinity: {
    ideal: [30, 37], // ppt for marine
    acceptable: [25, 40],
    critical: [20, 45],
    early_warning: { high: 35, low: 28 }
  },
  dissolved_oxygen: {
    ideal: [6, 12], // mg/L
    acceptable: [4, 14],
    critical: [2, 16],
    early_warning: { high: 10, low: 7 }
  },
  conductivity: {
    ideal: [50000, 60000], // µS/cm for marine
    acceptable: [35000, 70000],
    critical: [30000, 80000],
    early_warning: { high: 60000, low: 45000 }
  },
  tds: {
    ideal: [33000, 35000], // ppm for marine
    acceptable: [30000, 40000],
    critical: [25000, 45000],
    early_warning: { high: 36000, low: 32000 }
  }
};

// Trend Analysis Constants
export const TREND_ANALYSIS_CONFIG = {
  MIN_POINTS_FOR_TREND: 5,
  SIGNIFICANCE_THRESHOLD: 0.95, // p-value threshold
  CHANGE_DETECTION_THRESHOLD: 0.05, // 5% change
  SLIDING_WINDOW_SIZE: 10,
  ANOMALY_DETECTION_MULTIPLE: 2.5 // Standard deviations
};

// Processing Error Categories
export const PROCESSING_ERRORS = {
  VALIDATION_FAILED: 'Validation failed for input data',
  TRANSFORMATION_ERROR: 'Data transformation failed',
  STORAGE_ERROR: 'Unable to store processed data',
  TIMEOUT_ERROR: 'Processing operation timed out',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded during processing',
  INVALID_THRESHOLDS: 'Invalid threshold configuration',
  MODEL_LOAD_FAILED: 'Failed to load or initialize model',
  FORECAST_FAILED: 'Forecast generation failed',
  ALERT_CATEGORIZATION_FAILED: 'Alert categorization failed'
};

// Time Windows for Processing
export const TIME_WINDOWS = {
  REALTIME: { minutes: 5 },
  RECENT: { hours: 1 },
  SHORT_TERM: { hours: 6 },
  DAILY: { hours: 24 },
  WEEKLY: { days: 7 },
  MONTHLY: { days: 30 }
};

// Batch Processing Sizes
export const BATCH_SIZES = {
  SMALL: 10,
  MEDIUM: 50,
  LARGE: 200,
  MAXIMUM: 1000
};

// Parameter Units and Formatting
export const PARAMETER_UNITS = {
  ph: { unit: '', decimals: 2 },
  temperature: { unit: '°C', decimals: 1 },
  turbidity: { unit: 'NTU', decimals: 1 },
  salinity: { unit: 'ppt', decimals: 1 },
  dissolved_oxygen: { unit: 'mg/L', decimals: 1 },
  conductivity: { unit: 'µS/cm', decimals: 0 },
  tds: { unit: 'mg/L', decimals: 0 },
  nitrates: { unit: 'mg/L', decimals: 1 },
  phosphates: { unit: 'mg/L', decimals: 1 }
};

// Confidence Scoring
export const CONFIDENCE_SCORES = {
  VERY_LOW: { range: [0, 0.3], description: 'Inadequate data or high uncertainty' },
  LOW: { range: [0.3, 0.5], description: 'Limited confidence, consider additional measurements' },
  MODERATE: { range: [0.5, 0.7], description: 'Reasonable confidence for informed decisions' },
  HIGH: { range: [0.7, 0.9], description: 'Strong confidence in results' },
  VERY_HIGH: { range: [0.9, 1.0], description: 'Exceptional confidence and reliability' }
};

// Logging Configuration for Processing Services
export const PROCESSING_LOGGING_CONFIG = {
  ENABLE_DETAILED_LOGGING: false,
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },
  CURRENT_LEVEL: 2, // Default to INFO
  COMPONENTS: {
    ALERT_PROCESSOR: 'AlertProcessor',
    DATA_PROCESSOR: 'DataProcessor',
    FORECAST_PROCESSOR: 'ForecastProcessor',
    RECOMMENDATION_ENGINE: 'RecommendationEngine'
  }
};

// Performance Monitoring Thresholds
export const PERFORMANCE_THRESHOLDS = {
  ALERT_PROCESSING_MS: 500, // Alert should process within 500ms
  DATA_VALIDATION_MS: 200, // Data validation should be quick
  FORECAST_GENERATION_MS: 3000, // Forecast can take longer but not excessive
  MEMORY_USAGE_MB: 50, // Rough memory limit
  CPU_INTENSIVE_TIMEOUT_MS: 30000 // Timeout for heavy operations
};
