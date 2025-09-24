import { fetchAllDocuments } from '@services/firebase/firestore';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db as firestore } from '../firebase/config';

/**
 * Query optimization constants for different use cases
 */
const QUERY_LIMITS = {
  DASHBOARD_RECENT: 50,      // Last 50 records for dashboard
  CHART_DISPLAY: 100,        // Chart visualization limit
  PAGINATION_PAGE: 25,       // Records per page for pagination
  REALTIME_ONLY: 1,          // Just latest reading
  ALERT_ANALYSIS: 200,       // For alert processing
  CURRENT_DAY_OPTIMIZED: 100 // Optimized daily data fetch
};

export class SensorDataRepository {
  constructor() {
    this.collectionName = 'datm_data';

    // Bind methods to ensure 'this' context is preserved
    this.normalizeSensorData = this.normalizeSensorData.bind(this);
    this.parseDateTime = this.parseDateTime.bind(this);
    this.parseNumericValue = this.parseNumericValue.bind(this);
    this.assessDataQuality = this.assessDataQuality.bind(this);
  }

  async getMostRecent(limit = 1) {
    try {
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount: limit,
        orderByField: 'datetime',
        orderDirection: 'desc'
      });

      return data.map(this.normalizeSensorData);
    } catch (error) {
      console.error('❌ Error fetching recent sensor data:', error);
      throw error;
    }
  }

  async getByDateRange(startDate, endDate, limitCount = null, offset = 0) {
    try {
      console.log('🔍 Querying sensor data by date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limitCount,
        offset
      });

      // Use fetchAllDocuments with correct parameters for date range
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount: limitCount || 500, // Default limit if none specified
        orderByField: 'datetime',
        orderDirection: 'asc',
        startAfter: startDate,
        endBefore: endDate
      });

      if (data.length === 0) {
        console.warn('⚠️ No sensor data found for date range');
        return [];
      }

      // Apply client-side limit if specified
      const limitedData = limitCount ? data.slice(0, limitCount) : data;
      console.log(`✅ Retrieved ${limitedData.length} sensor records (${limitCount ? `limited to ${limitCount}` : 'all available'})`);
      return limitedData.map(this.normalizeSensorData);

    } catch (error) {
      console.error('❌ Error fetching sensor data by date range:', error);
      throw error;
    }
  }

  async getCurrentDayData(limit = QUERY_LIMITS.CURRENT_DAY_OPTIMIZED) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`🔍 Fetching current day data with limit: ${limit}`);
    return this.getByDateRange(today, tomorrow, limit);
  }

  async getAll(options = {}) {
    const {
      limitCount = QUERY_LIMITS.DASHBOARD_RECENT,
      orderByField = 'datetime',
      orderDirection = 'desc'
    } = options;

    console.log(`🔍 Fetching all sensor data with limit: ${limitCount}`);

    try {
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount,
        orderByField,
        orderDirection
      });

      console.log(`✅ Retrieved ${data.length} sensor records (limited to ${limitCount})`);
      return data.map(this.normalizeSensorData);
    } catch (error) {
      console.error('❌ Error fetching all sensor data:', error);
      throw error;
    }
  }

  /**
   * Get paginated sensor data with cursor-based pagination
   * @param {Object} options - Pagination options
   * @param {number} options.pageSize - Number of records per page
   * @param {number} options.page - Page number (1-based)
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @param {string} options.orderBy - Field to order by
   * @param {string} options.orderDirection - 'asc' or 'desc'
   * @returns {Promise<{data: Array, hasMore: boolean, totalCount: number}>}
   */
  async getPaginatedData(options = {}) {
    const {
      pageSize = QUERY_LIMITS.PAGINATION_PAGE,
      page = 1,
      startDate = null,
      endDate = null,
      orderBy = 'datetime',
      orderDirection = 'desc'
    } = options;

    console.log(`📄 Fetching paginated data: page ${page}, size ${pageSize}`);

    try {
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;

      // Use fetchAllDocuments with correct parameters
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount: pageSize * page, // Fetch enough for current page + check for more
        orderByField: orderBy,
        orderDirection: orderDirection,
        startAfter: startDate,
        endBefore: endDate
      });

      if (data.length === 0) {
        return {
          data: [],
          hasMore: false,
          totalCount: 0,
          currentPage: page,
          totalPages: 0
        };
      }

      // Apply pagination slice
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = data.slice(startIndex, endIndex);

      const hasMore = data.length > endIndex;
      const totalPages = Math.ceil(data.length / pageSize);

      console.log(`✅ Paginated data: ${pageData.length} records, hasMore: ${hasMore}`);

      return {
        data: pageData.map(this.normalizeSensorData),
        hasMore,
        totalCount: data.length,
        currentPage: page,
        totalPages
      };

    } catch (error) {
      console.error('❌ Error fetching paginated sensor data:', error);
      throw error;
    }
  }

  /**
   * Get optimized data for dashboard display
   * @param {Object} options - Optimization options
   * @returns {Promise<{recent: Array, summary: Object}>}
   */
  async getOptimizedDashboardData(options = {}) {
    const {
      recentLimit = QUERY_LIMITS.DASHBOARD_RECENT,
      hoursBack = 24
    } = options;

    console.log(`🏠 Fetching optimized dashboard data (${recentLimit} records, ${hoursBack}h back)`);

    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));

      const [recentData, summary] = await Promise.all([
        this.getByDateRange(startDate, now, recentLimit),
        this.getDataSummary(startDate, now)
      ]);

      return {
        recent: recentData,
        summary,
        metadata: {
          fetchedAt: now.toISOString(),
          recordCount: recentData.length,
          timeRange: `${hoursBack} hours`
        }
      };

    } catch (error) {
      console.error('❌ Error fetching optimized dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Summary statistics
   */
  async getDataSummary(startDate, endDate) {
    try {
      const data = await fetchAllDocuments(this.collectionName, {
        useCache: false,
        limitCount: QUERY_LIMITS.ALERT_ANALYSIS,
        orderByField: 'datetime',
        orderDirection: 'asc',
        startAfter: startDate,
        endBefore: endDate
      });

      if (data.length === 0) {
        return {
          totalRecords: 0,
          parameters: {},
          timeSpan: null
        };
      }

      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const summary = {
        totalRecords: data.length,
        parameters: {},
        timeSpan: {
          start: data[0].datetime,
          end: data[data.length - 1].datetime
        }
      };

      // Calculate parameter statistics
      parameters.forEach(param => {
        const values = data
          .map(reading => reading[param])
          .filter(value => value !== null && value !== undefined && !isNaN(value));

        if (values.length > 0) {
          summary.parameters[param] = {
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            latest: data[data.length - 1][param],
            readings: values.length
          };
        }
      });

      return summary;

    } catch (error) {
      console.error('❌ Error generating data summary:', error);
      return { totalRecords: 0, parameters: {}, timeSpan: null };
    }
  }

  normalizeSensorData(rawData) {
    const normalized = {
      id: rawData.id,
      datetime: this.parseDateTime(rawData.datetime),
      timestamp: this.parseDateTime(rawData.datetime),
      
      // Water quality parameters
      pH: this.parseNumericValue(rawData.pH),
      temperature: this.parseNumericValue(rawData.temperature),
      turbidity: this.parseNumericValue(rawData.turbidity),
      salinity: this.parseNumericValue(rawData.salinity),
      tds: this.parseNumericValue(rawData.tds),
      
      // Environmental data
      isRaining: Boolean(rawData.isRaining),
      
      // Metadata
      source: rawData.source || 'sensor',
      quality: this.assessDataQuality(rawData)
    };

    return normalized;
  }

  parseDateTime(datetime) {
    if (!datetime) return new Date();
    
    if (datetime.toDate && typeof datetime.toDate === 'function') {
      return datetime.toDate();
    }
    
    return new Date(datetime);
  }

  parseNumericValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  assessDataQuality(rawData) {
    const requiredFields = ['pH', 'temperature', 'turbidity', 'salinity'];
    const presentFields = requiredFields.filter(field => 
      rawData[field] !== null && 
      rawData[field] !== undefined && 
      !isNaN(parseFloat(rawData[field]))
    );

    const completeness = presentFields.length / requiredFields.length;
    
    if (completeness === 1) return 'complete';
    if (completeness >= 0.75) return 'good';
    if (completeness >= 0.5) return 'partial';
    return 'incomplete';
  }
}