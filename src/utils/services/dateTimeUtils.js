// Service Date/Time Utilities
// Specialized utilities for handling dates and timestamps across services

import {
  HISTORICAL_ALERTS_CONFIG,
  DATA_TRANSFORMATION_CONFIG,
  SERVICE_LOGGING_CONFIG
} from '../../constants/services.js';

/**
 * Logs date/time operations
 * @param {string} operation - Operation name
 * @param {...any} args - Additional log arguments
 */
function logDateTime(operation, ...args) {
  if (!SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) return;

  if (SERVICE_LOGGING_CONFIG.CURRENT_LEVEL >= SERVICE_LOGGING_CONFIG.LOG_LEVELS.DEBUG) {
    console.log(`[DateTime:${operation}]`, ...args);
  }
}

/**
 * Parses complex date strings from various Firebase formats
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export function parseComplexDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    logDateTime('parse.error', 'Invalid or empty date string');
    return null;
  }

  try {
    // Try Firebase locale format first: "Month DD, YYYY at HH:MM:SS AM/PM UTC+X"
    let parsedDate = parseFirebaseLocaleString(dateString);
    if (parsedDate) return parsedDate;

    // Try standard Date parsing as fallback
    parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return validateDateRange(parsedDate) ? parsedDate : null;
    }

    logDateTime('parse.error', 'Failed to parse date string:', dateString);
    return null;
  } catch (error) {
    logDateTime('parse.error', 'Exception parsing date string:', error);
    return null;
  }
}

/**
 * Parses Firebase locale date format: "November 19, 2025 at 4:55:28 PM UTC+8"
 * @param {string} dateString - Firebase formatted date string
 * @returns {Date|null} Parsed Date object
 */
export function parseFirebaseLocaleString(dateString) {
  // Match format: "Month DD, YYYY at HH:MM:SS AM/PM UTC+X"
  const localeMatch = dateString.match(
    /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)\s+UTC([+-]\d+)$/
  );

  if (!localeMatch) return null;

  const [, monthName, day, year, hour, minute, second, ampm, utcOffset] = localeMatch;

  try {
    // Convert month name to zero-based index
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.findIndex(name =>
      name.toLowerCase() === monthName.toLowerCase()
    );

    if (monthIndex === -1) {
      logDateTime('parse.error', 'Invalid month name:', monthName);
      return null;
    }

    // Convert hour to 24-hour format
    let hour24 = parseInt(hour, 10);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    // Create local date object
    const localDate = new Date(
      parseInt(year), monthIndex, parseInt(day),
      hour24, parseInt(minute), parseInt(second)
    );

    // Verify the date is valid and reasonable
    if (!isNaN(localDate.getTime()) && validateDateRange(localDate)) {
      logDateTime('parse.success', `Parsed locale date: ${dateString} -> ${localDate.toISOString()}`);
      return localDate;
    }

    return null;
  } catch (error) {
    logDateTime('parse.error', 'Exception parsing locale date:', error);
    return null;
  }
}

/**
 * Validates that a date falls within reasonable bounds
 * @param {Date} date - Date to validate
 * @returns {boolean} Whether date is within valid range
 */
export function validateDateRange(date) {
  if (!date || isNaN(date.getTime())) return false;

  const year = date.getFullYear();
  const minYear = HISTORICAL_ALERTS_CONFIG.VALID_TIMESTAMP_YEARS.MIN;
  const maxYear = HISTORICAL_ALERTS_CONFIG.VALID_TIMESTAMP_YEARS.MAX;

  return year >= minYear && year <= maxYear;
}

/**
 * Extracts timestamp from alert ID using pattern: alert_[timestamp]_[suffix]
 * @param {string} alertId - Alert ID to extract timestamp from
 * @returns {Date|null} Extracted date or null if extraction fails
 */
export function extractTimestampFromAlertId(alertId) {
  if (!alertId || typeof alertId !== 'string') return null;

  // Match pattern: alert_[digits]_[any characters]
  const match = alertId.match(/^alert_(\d+)_/);
  if (match && match[1]) {
    try {
      const timestampMs = parseInt(match[1], 10);
      const date = new Date(timestampMs);

      // Validate reasonable timestamp range
      if (validateDateRange(date)) {
        logDateTime('extract.success', `Extracted timestamp from ID: ${alertId} -> ${date.toISOString()}`);
        return date;
      }
    } catch (error) {
      logDateTime('extract.error', `Failed to extract timestamp from ID: ${alertId}`, error);
    }
  }

  return null;
}

/**
 * Normalizes alert timestamp from various sources
 * @param {Object} alert - Alert object with potential timestamp fields
 * @returns {Object} Normalized timestamp object with date and seconds
 */
export function normalizeAlertTimestamp(alert) {
  if (!alert) {
    logDateTime('normalize.error', 'No alert object provided');
    return createDefaultTimestamp();
  }

  let timestamp = null;

  // Priority order for timestamp sources
  if (alert.timestamp) {
    timestamp = parseTimestampValue(alert.timestamp);
  } else if (alert.createdAt) {
    timestamp = parseTimestampValue(alert.createdAt);
  }

  // Try extracting from alert ID as last resort
  if (!timestamp) {
    timestamp = extractTimestampFromAlertId(alert.id);
  }

  // Fallback to current time if all else fails
  if (!timestamp) {
    logDateTime('normalize.warning', 'Using default timestamp for alert:', alert.id);
    timestamp = new Date();
  }

  return {
    seconds: Math.floor(timestamp.getTime() / 1000),
    date: timestamp,
  };
}

/**
 * Parses various timestamp value formats
 * @param {*} timestampValue - Timestamp value to parse
 * @returns {Date|null} Parsed Date object or null
 */
export function parseTimestampValue(timestampValue) {
  if (!timestampValue) return null;

  // Handle Firestore Timestamp
  if (timestampValue.toDate && typeof timestampValue.toDate === 'function') {
    return timestampValue.toDate();
  }

  // Handle numeric timestamps (assume milliseconds, convert if needed)
  if (typeof timestampValue === 'number') {
    // Check if it's reasonable as milliseconds (between 2020-2030)
    const date = new Date(timestampValue);
    if (validateDateRange(date)) {
      return date;
    }

    // Try converting seconds to milliseconds
    const dateFromSeconds = new Date(timestampValue * 1000);
    if (validateDateRange(dateFromSeconds)) {
      return dateFromSeconds;
    }

    return null;
  }

  // Handle string timestamps
  if (typeof timestampValue === 'string') {
    return parseComplexDateString(timestampValue);
  }

  logDateTime('parse.error', 'Unsupported timestamp format:', typeof timestampValue);
  return null;
}

/**
 * Creates a default timestamp object
 * @returns {Object} Default timestamp with current time
 */
export function createDefaultTimestamp() {
  const now = new Date();
  return {
    seconds: Math.floor(now.getTime() / 1000),
    date: now,
  };
}

/**
 * Calculates human-readable age for display
 * @param {Object} timestamp - Normalized timestamp object
 * @returns {string} Human-readable age string
 */
export function calculateHumanReadableAge(timestamp) {
  const alertTime = timestamp?.date || new Date();
  const now = new Date();
  const ageMs = now - alertTime;

  // Handle invalid dates
  if (isNaN(ageMs) || ageMs < 0) {
    return 'Time unknown';
  }

  const ageSeconds = Math.floor(Math.abs(ageMs) / 1000);

  if (ageSeconds < 60) return 'Just now';
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)} min ago`;
  if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)} hr ago`;

  return `${Math.floor(ageSeconds / 86400)} day${Math.floor(ageSeconds / 86400) > 1 ? 's' : ''} ago`;
}

/**
 * Groups alerts into time-based sections for display
 * @param {Array} alerts - Array of alert objects with timestamp
 * @returns {Array} Array of section objects for SectionList
 */
export function groupAlertsByTimeSections(alerts) {
  if (!Array.isArray(alerts)) {
    logDateTime('group.error', 'Invalid alerts array provided');
    return [];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Initialize sections
  const sections = Object.values(HISTORICAL_ALERTS_CONFIG.SECTIONS).map(title => ({
    title,
    data: []
  }));

  // Group alerts by time period
  alerts.forEach(alert => {
    try {
      const alertTimestamp = alert?.timestamp?.date;
      if (!alertTimestamp || isNaN(alertTimestamp.getTime())) {
        logDateTime('group.warning', 'Invalid timestamp for alert:', alert?.id);
        return;
      }

      const alertDay = new Date(
        alertTimestamp.getFullYear(),
        alertTimestamp.getMonth(),
        alertTimestamp.getDate()
      );

      let sectionTitle;
      if (alertDay.getTime() === today.getTime()) {
        sectionTitle = HISTORICAL_ALERTS_CONFIG.SECTIONS.TODAY;
      } else if (alertDay.getTime() === yesterday.getTime()) {
        sectionTitle = HISTORICAL_ALERTS_CONFIG.SECTIONS.YESTERDAY;
      } else if (alertTimestamp >= thisWeek) {
        sectionTitle = HISTORICAL_ALERTS_CONFIG.SECTIONS.THIS_WEEK;
      } else {
        sectionTitle = HISTORICAL_ALERTS_CONFIG.SECTIONS.OLDER;
      }

      const section = sections.find(s => s.title === sectionTitle);
      if (section) {
        section.data.push({
          ...alert,
          dataAge: calculateHumanReadableAge(alert.timestamp)
        });
      }
    } catch (error) {
      logDateTime('group.error', 'Error processing alert for grouping:', error);
    }
  });

  // Remove empty sections
  return sections.filter(section => section.data.length > 0);
}

/**
 * Creates time-based query bounds for data filtering
 * @param {string} filter - Time filter ('today', 'week', 'month', etc.)
 * @returns {Object} Start and end date bounds
 */
export function createTimeBounds(filter) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (filter.toLowerCase()) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      start.setTime(weekStart.getTime());
      break;

    case 'month':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      break;

    default:
      // Default to last 24 hours
      start.setTime(now.getTime() - 24 * 60 * 60 * 1000);
  }

  logDateTime('bounds', `Created ${filter} bounds: ${start.toISOString()} - ${end.toISOString()}`);

  return { start, end };
}
