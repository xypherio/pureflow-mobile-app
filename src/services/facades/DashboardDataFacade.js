import { performanceMonitor } from '@utils/performance-monitor.js';

export class DashboardDataFacade {
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
   * Get comprehensive dashboard data
   */
  async getDashboardData(options = {}) {
    const {
      useCache = true,
      includeHistorical = true,
      includeForecasts = false
    } = options;

    return await performanceMonitor.measureAsync('dashboardFacade.getData', async () => {
      console.log('🏠 Loading dashboard data...');

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
          includeHistorical ? this.getTodayData() : Promise.resolve([]),
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
            systemStatus: this.assessSystemStatus(currentData, activeAlerts)
          }
        };

        // Cache the result
        if (useCache) {
          await this.dataCacheService.cacheSensorData('dashboard', dashboardData);
        }

        console.log('✅ Dashboard data loaded successfully');
        return dashboardData;

      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        throw error;
      }
    });
  }

  /**
   * Get current sensor reading
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
   * Get today's data
   */
  async getTodayData() {
    try {
      const todayData = await this.sensorDataRepository.getCurrentDayData();
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
}