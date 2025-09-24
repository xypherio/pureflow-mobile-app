/**
 * DashboardDataFacade.js
 * 
 * A facade that provides a unified interface for retrieving and processing
 * dashboard-related data from various sources.
 * 
 * Responsibilities:
 * - Aggregate data from multiple sources for dashboard display
 * - Handle data caching and performance optimization
 * - Calculate metrics and indicators
 * - Generate summaries and trends
 * 
 * @module DashboardDataFacade
 */

import { performanceMonitor } from '@utils/performance-monitor.js';

/**
 * Provides a high-level interface for accessing dashboard data.
 * Handles data aggregation, caching, and transformation for the dashboard UI.
 */
export class DashboardDataFacade {
  /**
   * Creates a new DashboardDataFacade instance.
   * 
   * @param {Object} dependencies - Required dependencies
   * @param {Object} dependencies.sensorDataRepository - Repository for accessing sensor data
   * @param {Object} dependencies.alertRepository - Repository for accessing alert data
   * @param {Object} dependencies.dataAggregationService - Service for data aggregation
   * @param {Object} dependencies.waterQualityCalculator - Service for calculating WQI
   * @param {Object} dependencies.dataCacheService - Service for caching dashboard data
   * @param {Object} dependencies.alertProcessor - Service for processing alerts
   * @param {Object} dependencies.dataProcessor - Service for processing raw sensor data
   */
  constructor({
    sensorDataRepository,
    alertRepository,
    dataAggregationService,
    waterQualityCalculator,
    dataCacheService,
    alertProcessor,
    dataProcessor
  }) {
    this.sensorDataRepository = sensorDataRepository;
    this.alertRepository = alertRepository;
    this.dataAggregationService = dataAggregationService;
    this.waterQualityCalculator = waterQualityCalculator;
    this.dataCacheService = dataCacheService;
    this.alertProcessor = alertProcessor;
    this.dataProcessor = dataProcessor;
  }

  /**
   * Retrieves comprehensive dashboard data including current readings, trends, and alerts.
   * 
   * This method orchestrates data retrieval from multiple sources, applies necessary
   * transformations, and returns a unified dashboard data structure.
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.useCache=true] - Whether to use cached data when available
   * @param {boolean} [options.includeHistorical=true] - Whether to include historical data
   * @param {boolean} [options.includeForecasts=false] - Whether to include forecast data
   * @param {number} [options.historicalLimit=50] - Limit for historical data records
   * @param {number} [options.hoursBack=24] - Hours back to fetch data from
   * @returns {Promise<Object>} Dashboard data object containing:
   * @property {Object} current - Current sensor readings and WQI
   * @property {Object} today - Today's data points and trends
   * @property {Object} alerts - Active alerts and summary
   * @property {Object} metadata - Additional metadata about the data
   * @throws {Error} If data retrieval or processing fails
   */
  async getDashboardData(options = {}) {
    const {
      useCache = true,
      includeHistorical = true,
      includeForecasts = false,
      historicalLimit = 50,  // Smart default instead of unlimited
      hoursBack = 24         // Reasonable time window
    } = options;

    return await performanceMonitor.measureAsync('dashboardFacade.getData', async () => {
      console.log('🏠 Loading optimized dashboard data...', {
        useCache,
        includeHistorical,
        historicalLimit,
        hoursBack
      });

      try {
        // Check cache first
        if (useCache) {
          const cached = await this.dataCacheService.getCachedSensorData('dashboard');
          if (cached) {
            console.log('📦 Using cached dashboard data');
            return cached;
          }
        }

        // Load data in parallel for better performance
        const [currentData, todayData, activeAlerts] = await Promise.all([
          this.getCurrentReading(),
          includeHistorical ? this.getTodayData(historicalLimit) : Promise.resolve([]),
          this.getActiveAlerts()
        ]);

        // Calculate water quality index
        const wqi = currentData ? this.waterQualityCalculator.calculateWQI(currentData) : null;

        // Prepare dashboard data
        const dashboardData = {
          current: {
            reading: currentData,
            wqi,
            dataAge: this.calculateDataAge(currentData),
            isRealTime: this.isRealTimeData(currentData)
          },
          today: {
            data: todayData,
            summary: this.generateTodaySummary(todayData),
            trends: this.calculateTrends(todayData)
          },
          alerts: {
            active: activeAlerts,
            summary: this.generateAlertSummary(activeAlerts),
            urgent: activeAlerts.filter(alert => alert.severity === 'high')
          },
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataQuality: this.assessOverallDataQuality([currentData, ...todayData]),
            systemStatus: this.assessSystemStatus(currentData, activeAlerts),
            optimization: {
              historicalLimit,
              hoursBack,
              totalRecords: todayData.length,
              isOptimized: true
            }
          }
        };

        // Cache the result
        if (useCache) {
          await this.dataCacheService.cacheSensorData('dashboard', dashboardData);
        }

        console.log('✅ Optimized dashboard data loaded successfully', {
          records: todayData.length,
          alerts: activeAlerts.length,
          optimization: dashboardData.metadata.optimization
        });
        return dashboardData;

      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        throw error;
      }
    });
  }

  /**
   * Retrieves the most recent sensor reading.
   * 
   * @returns {Promise<Object|null>} The most recent sensor reading or null if none available
   * @property {number} timestamp - Unix timestamp of the reading
   * @property {Object} parameters - Key-value pairs of sensor parameters
   * @property {string} source - Data source identifier
   */
  async getCurrentReading() {
    try {
      const recentData = await this.sensorDataRepository.getMostRecent(1);
      return recentData.length > 0 ? recentData[0] : null;
    } catch (error) {
      console.error('❌ Error getting current reading:', error);
      return null;
    }
  }

  /**
   * Get today's data with optimization
   */
  async getTodayData(limit = 50) {
    try {
      // Use the optimized repository method with limit
      const todayData = await this.sensorDataRepository.getCurrentDayData(limit);
      console.log(`📊 Retrieved ${todayData.length} records for today (limited to ${limit})`);
      return todayData || [];
    } catch (error) {
      console.error('❌ Error getting today\'s data:', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      const alerts = await this.alertRepository.getActiveAlerts();
      return alerts || [];
    } catch (error) {
      console.error('❌ Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Generate summary for today's data
   */
  generateTodaySummary(data) {
    if (!data || data.length === 0) {
      return {
        readings: 0,
        parameters: {},
        timeSpan: null
      };
    }

    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    const summary = {
      readings: data.length,
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
  }

  /**
   * Calculate trends for today's data
   */
  calculateTrends(data) {
    if (!data || data.length < 2) {
      return {};
    }

    const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    const trends = {};

    parameters.forEach(param => {
      const trend = this.dataAggregationService.calculateTrend(data, param);
      trends[param] = trend;
    });

    return trends;
  }

  /**
   * Generate alert summary
   */
  generateAlertSummary(alerts) {
    const summary = {
      total: alerts.length,
      bySeverity: { high: 0, medium: 0, low: 0 },
      byParameter: {},
      mostRecent: alerts.length > 0 ? alerts[0] : null
    };

    alerts.forEach(alert => {
      // Count by severity
      if (summary.bySeverity[alert.severity] !== undefined) {
        summary.bySeverity[alert.severity]++;
      }

      // Count by parameter
      if (alert.parameter) {
        summary.byParameter[alert.parameter] = (summary.byParameter[alert.parameter] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Calculate data age
   */
  calculateDataAge(data) {
    if (!data || !data.datetime) {
      return 'No data';
    }

    const now = new Date();
    const dataTime = new Date(data.datetime);
    const ageMs = now - dataTime;

    if (ageMs < 60000) return 'Just now';
    if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)} min ago`;
    if (ageMs < 86400000) return `${Math.floor(ageMs / 3600000)} hr ago`;
    return `${Math.floor(ageMs / 86400000)} day(s) ago`;
  }

  /**
   * Check if data is real-time
   */
  isRealTimeData(data) {
    if (!data || !data.datetime) return false;
    
    const now = new Date();
    const dataTime = new Date(data.datetime);
    const ageMs = now - dataTime;
    
    return ageMs < 300000; // 5 minutes
  }

  /**
   * Assess overall data quality
   */
  assessOverallDataQuality(allData) {
    const validData = allData.filter(item => item && item.quality);
    
    if (validData.length === 0) return 'unknown';
    
    const qualityScores = {
      complete: 4,
      good: 3,
      partial: 2,
      incomplete: 1
    };
    
    const totalScore = validData.reduce((sum, item) => 
      sum + (qualityScores[item.quality] || 0), 0
    );
    
    const averageScore = totalScore / validData.length;
    
    if (averageScore >= 3.5) return 'excellent';
    if (averageScore >= 2.5) return 'good';
    if (averageScore >= 1.5) return 'fair';
    return 'poor';
  }

  /**
   * Assess system status
   */
  assessSystemStatus(currentData, alerts) {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'high');
    
    if (criticalAlerts.length > 0) {
      return {
        status: 'critical',
        message: `${criticalAlerts.length} critical alert(s) active`,
        color: '#F44336'
      };
    }
    
    if (!currentData) {
      return {
        status: 'offline',
        message: 'No recent data available',
        color: '#9E9E9E'
      };
    }
    
    const dataAge = new Date() - new Date(currentData.datetime);
    if (dataAge > 600000) { // 10 minutes
      return {
        status: 'warning',
        message: 'Data may be stale',
        color: '#FF9800'
      };
    }
    
    if (alerts.length > 0) {
      return {
        status: 'warning',
        message: `${alerts.length} alert(s) active`,
        color: '#FF9800'
      };
    }
    
    return {
      status: 'healthy',
      message: 'System operating normally',
      color: '#4CAF50'
    };
  }

  /**
   * Refresh dashboard data
   */
  async refreshData() {
    // Invalidate cache
    await this.dataCacheService.invalidateSensorData('dashboard');
    
    // Reload data
    return await this.getDashboardData({ useCache: false });
  }

  /**
   * Get paginated historical data
   * @param {Object} options - Pagination options
   * @returns {Promise<{data: Array, hasMore: boolean, totalCount: number}>}
   */
  async getPaginatedHistoricalData(options = {}) {
    const {
      pageSize = 25,
      page = 1,
      startDate = null,
      endDate = null,
      hoursBack = 24
    } = options;

    console.log(`📄 Getting paginated historical data: page ${page}, size ${pageSize}`);

    try {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate.getTime() - (hoursBack * 60 * 60 * 1000));

      const result = await this.sensorDataRepository.getPaginatedData({
        pageSize,
        page,
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate,
        orderBy: 'datetime',
        orderDirection: 'desc'
      });

      console.log(`✅ Paginated data retrieved: ${result.data.length} records`);
      return result;

    } catch (error) {
      console.error('❌ Error getting paginated historical data:', error);
      throw error;
    }
  }

  /**
   * Get optimized dashboard data with smart defaults
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimized dashboard data
   */
  async getOptimizedDashboardData(options = {}) {
    const {
      recentLimit = 50,
      hoursBack = 24,
      includeSummary = true
    } = options;

    console.log(`🏠 Getting optimized dashboard data (${recentLimit} records, ${hoursBack}h back)`);

    try {
      const result = await this.sensorDataRepository.getOptimizedDashboardData({
        recentLimit,
        hoursBack
      });

      // Add alerts to the result
      const activeAlerts = await this.getActiveAlerts();

      return {
        ...result,
        alerts: {
          active: activeAlerts,
          summary: this.generateAlertSummary(activeAlerts),
          urgent: activeAlerts.filter(alert => alert.severity === 'high')
        }
      };

    } catch (error) {
      console.error('❌ Error getting optimized dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get data summary for a specific time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Summary statistics
   */
  async getDataSummary(startDate, endDate) {
    try {
      return await this.sensorDataRepository.getDataSummary(startDate, endDate);
    } catch (error) {
      console.error('❌ Error getting data summary:', error);
      return { totalRecords: 0, parameters: {}, timeSpan: null };
    }
  }
}