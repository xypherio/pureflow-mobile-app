import { performanceMonitor } from '@utils/performance-monitor';

export class ReportsDataFacade {
    constructor({
      sensorDataRepository,
      dataAggregationService,
      waterQualityCalculator,
      dataCacheService,
      dataProcessor
    }) {
      this.sensorDataRepository = sensorDataRepository;
      this.dataAggregationService = dataAggregationService;
      this.waterQualityCalculator = waterQualityCalculator;
      this.dataCacheService = dataCacheService;
      this.dataProcessor = dataProcessor;
    }
  
    /**
     * Generate comprehensive report
     */
    async generateReport(timeFilter, customDateRange = null) {
      return await performanceMonitor.measureAsync('reportsFacade.generateReport', async () => {
        console.log(`📊 Generating ${timeFilter} report...`);
  
        try {
          // Determine date range
          const dateRange = customDateRange || this.getDateRangeForFilter(timeFilter);
          
          // Check cache
          const cacheKey = `report_${timeFilter}_${dateRange.start}_${dateRange.end}`;
          const cached = await this.dataCacheService.getCachedAggregatedData(timeFilter, dateRange);
          
          if (cached) {
            console.log('📦 Using cached report data');
            return this.processReportData(cached, timeFilter, dateRange);
          }
  
          // Fetch raw data
          const rawData = await this.sensorDataRepository.getByDateRange(
            new Date(dateRange.start),
            new Date(dateRange.end)
          );
  
          console.log(`📈 Retrieved ${rawData.length} data points for report`);
  
          if (rawData.length === 0) {
            return this.generateEmptyReport(timeFilter, dateRange);
          }
  
          // Process and validate data
          const processingResult = await this.dataProcessor.processData(rawData);
          
          if (processingResult.errors.length > 0) {
            console.warn(`⚠️ Data processing warnings:`, processingResult.errors);
          }
  
          const processedData = processingResult.processed || rawData;
  
          // Aggregate data based on time filter
          const aggregatedData = this.dataAggregationService.aggregateByInterval(
            processedData,
            this.getAggregationInterval(timeFilter)
          );
  
          // Cache aggregated data
          await this.dataCacheService.cacheAggregatedData(timeFilter, dateRange, aggregatedData);
  
          // Generate final report
          const report = await this.processReportData(aggregatedData, timeFilter, dateRange);
          
          console.log(`✅ Report generated: ${report.summary.dataPoints} data points, WQI ${report.wqi.overall}`);
          return report;
  
        } catch (error) {
          console.error('❌ Error generating report:', error);
          throw error;
        }
      });
    }
  
    /**
     * Process aggregated data into report format
     */
    async processReportData(aggregatedData, timeFilter, dateRange) {
      const report = {
        timeFilter,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
          label: this.getDateRangeLabel(timeFilter, dateRange)
        },
        summary: this.generateSummary(aggregatedData),
        wqi: this.calculateWQIForPeriod(aggregatedData),
        parameters: this.analyzeParameters(aggregatedData),
        trends: this.analyzeTrends(aggregatedData),
        chartData: this.prepareChartData(aggregatedData, timeFilter),
        insights: this.generateInsights(aggregatedData),
        metadata: {
          generatedAt: new Date().toISOString(),
          dataQuality: this.assessDataQuality(aggregatedData),
          completeness: this.calculateDataCompleteness(aggregatedData)
        }
      };
  
      return report;
    }
  
    /**
     * Generate summary statistics
     */
    generateSummary(data) {
      return {
        dataPoints: data.length,
        timeSpan: data.length > 0 ? {
          start: data[0].datetime,
          end: data[data.length - 1].datetime,
          duration: this.calculateDuration(data[0].datetime, data[data.length - 1].datetime)
        } : null,
        coverage: this.calculateCoverage(data),
        quality: this.assessDataQuality(data)
      };
    }
  
    /**
     * Calculate WQI for the entire period
     */
    calculateWQIForPeriod(data) {
      if (!data || data.length === 0) {
        return { overall: null, trend: null, distribution: null };
      }
  
      const wqiValues = [];
      const validData = [];
  
      // Calculate WQI for each data point
      data.forEach(point => {
        const wqi = this.waterQualityCalculator.calculateWQI(point);
        if (wqi && wqi.overall !== null) {
          wqiValues.push(wqi.overall);
          validData.push({ ...point, wqi: wqi.overall });
        }
      });
  
      if (wqiValues.length === 0) {
        return { overall: null, trend: null, distribution: null };
      }
  
      // Calculate statistics
      const average = wqiValues.reduce((sum, val) => sum + val, 0) / wqiValues.length;
      const min = Math.min(...wqiValues);
      const max = Math.max(...wqiValues);
      
      // Calculate trend
      const trend = this.dataAggregationService.calculateTrend(validData, 'wqi');
  
      // Calculate distribution
      const distribution = this.calculateWQIDistribution(wqiValues);
  
      return {
        overall: Math.round(average),
        average: Math.round(average * 100) / 100,
        min,
        max,
        trend,
        distribution,
        rating: this.waterQualityCalculator.getRating(average)
      };
    }
  
    /**
     * Analyze individual parameters
     */
    analyzeParameters(data) {
      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const analysis = {};
  
      parameters.forEach(param => {
        const stats = this.dataAggregationService.calculateStatistics(data, param);
        const trend = this.dataAggregationService.calculateTrend(data, param);
        
        analysis[param] = {
          statistics: stats,
          trend,
          compliance: this.calculateParameterCompliance(data, param),
          alerts: this.countParameterAlerts(data, param)
        };
      });
  
      return analysis;
    }
  
    /**
     * Analyze trends across all parameters
     */
    analyzeTrends(data) {
      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const trends = {};
  
      parameters.forEach(param => {
        trends[param] = this.dataAggregationService.calculateTrend(data, param);
      });
  
      // Overall trend assessment
      const trendDirections = Object.values(trends).map(t => t.trend);
      const improvingCount = trendDirections.filter(t => 
        (t === 'decreasing' && ['turbidity', 'salinity'].includes(param)) ||
        (t === 'stable')
      ).length;
  
      trends.overall = {
        improving: improvingCount / parameters.length > 0.5,
        stable: trendDirections.filter(t => t === 'stable').length,
        concerning: trendDirections.filter(t => t === 'increasing' || t === 'decreasing').length
      };
  
      return trends;
    }
  
    /**
     * Prepare data for charting
     */
    prepareChartData(data, timeFilter) {
      if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
      }
  
      // Prepare labels based on time filter
      const labels = data.map(point => this.formatChartLabel(point.datetime, timeFilter));
  
      // Prepare datasets for each parameter
      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const colors = {
        pH: '#2196F3',
        temperature: '#FF5722',
        turbidity: '#FF9800',
        salinity: '#4CAF50'
      };
  
      const datasets = parameters.map(param => ({
        label: param.charAt(0).toUpperCase() + param.slice(1),
        data: data.map(point => {
          const value = point[param];
          return value && typeof value === 'object' && value.average !== undefined 
            ? value.average 
            : value;
        }),
        borderColor: colors[param],
        backgroundColor: colors[param] + '20',
        tension: 0.1
      }));
  
      return { labels, datasets };
    }
  
    /**
     * Generate insights and recommendations
     */
    generateInsights(data) {
      const insights = [];
  
      if (!data || data.length === 0) {
        insights.push({
          type: 'warning',
          title: 'No Data Available',
          message: 'No data available for the selected time period.',
          priority: 'high'
        });
        return insights;
      }
  
      // Analyze each parameter for insights
      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      
      parameters.forEach(param => {
        const trend = this.dataAggregationService.calculateTrend(data, param);
        const stats = this.dataAggregationService.calculateStatistics(data, param);
        
        if (!stats) return;
  
        // Trend insights
        if (trend.trend === 'increasing' && ['turbidity', 'salinity'].includes(param)) {
          insights.push({
            type: 'warning',
            title: `${param.charAt(0).toUpperCase() + param.slice(1)} Increasing`,
            message: `${param} shows an increasing trend, which may require attention.`,
            priority: 'medium',
            parameter: param,
            recommendation: this.getParameterRecommendation(param, 'increasing')
          });
        }
  
        // Variability insights
        if (stats.standardDeviation > stats.mean * 0.2) {
          insights.push({
            type: 'info',
            title: `High ${param.charAt(0).toUpperCase() + param.slice(1)} Variability`,
            message: `${param} shows high variability, which may indicate system instability.`,
            priority: 'low',
            parameter: param,
            recommendation: 'Monitor system stability and check for external factors affecting ' + param
          });
        }
      });
  
      // Overall system insights
      const wqi = this.calculateWQIForPeriod(data);
      if (wqi.overall !== null) {
        if (wqi.overall < 50) {
          insights.push({
            type: 'critical',
            title: 'Poor Water Quality',
            message: `Average WQI of ${wqi.overall} indicates poor water quality.`,
            priority: 'high',
            recommendation: 'Immediate system review and corrective actions required'
          });
        } else if (wqi.overall > 85) {
          insights.push({
            type: 'success',
            title: 'Excellent Water Quality',
            message: `Average WQI of ${wqi.overall} indicates excellent water quality.`,
            priority: 'low',
            recommendation: 'Continue current maintenance practices'
          });
        }
      }
  
      return insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    }
  
    // Helper methods
    getDateRangeForFilter(timeFilter) {
      const now = new Date();
      const start = new Date(now);
      
      switch (timeFilter) {
        case 'daily':
          start.setHours(0, 0, 0, 0);
          return { start: start.toISOString(), end: now.toISOString() };
        case 'weekly':
          start.setDate(now.getDate() - 7);
          return { start: start.toISOString(), end: now.toISOString() };
        case 'monthly':
          start.setMonth(now.getMonth() - 1);
          return { start: start.toISOString(), end: now.toISOString() };
        case 'annually':
          start.setFullYear(now.getFullYear() - 1);
          return { start: start.toISOString(), end: now.toISOString() };
        default:
          start.setHours(0, 0, 0, 0);
          return { start: start.toISOString(), end: now.toISOString() };
      }
    }
  
    getAggregationInterval(timeFilter) {
      const intervalMap = {
        daily: '2hour',
        weekly: 'daily',
        monthly: 'daily',
        annually: 'monthly'
      };
      return intervalMap[timeFilter] || 'daily';
    }
  
    getDateRangeLabel(timeFilter, dateRange) {
      const start = new Date(dateRange.start).toLocaleDateString();
      const end = new Date(dateRange.end).toLocaleDateString();
      return `${start} - ${end}`;
    }
  
    formatChartLabel(datetime, timeFilter) {
      const date = new Date(datetime);
      
      switch (timeFilter) {
        case 'daily':
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        case 'weekly':
        case 'monthly':
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        case 'annually':
          return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
        default:
          return date.toLocaleString();
      }
    }
  
    calculateDuration(start, end) {
      const duration = new Date(end) - new Date(start);
      const days = Math.floor(duration / (1000 * 60 * 60 * 24));
      const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days} day(s) ${hours} hour(s)`;
      return `${hours} hour(s)`;
    }
  
    calculateCoverage(data) {
      if (!data || data.length === 0) return 0;
      
      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      let totalPossible = data.length * parameters.length;
      let totalPresent = 0;
      
      data.forEach(point => {
        parameters.forEach(param => {
          if (point[param] !== null && point[param] !== undefined) {
            totalPresent++;
          }
        });
      });
      
      return Math.round((totalPresent / totalPossible) * 100);
    }
  
    assessDataQuality(data) {
      if (!data || data.length === 0) return 'no-data';
      
      const coverage = this.calculateCoverage(data);
      
      if (coverage >= 90) return 'excellent';
      if (coverage >= 75) return 'good';
      if (coverage >= 50) return 'fair';
      return 'poor';
    }
  
    calculateDataCompleteness(data) {
      return this.calculateCoverage(data);
    }
  
    calculateWQIDistribution(wqiValues) {
      const ranges = {
        excellent: { min: 90, max: 100 },
        good: { min: 70, max: 89 },
        fair: { min: 50, max: 69 },
        poor: { min: 25, max: 49 },
        veryPoor: { min: 0, max: 24 }
      };
  
      const distribution = {};
      Object.keys(ranges).forEach(key => {
        distribution[key] = 0;
      });
  
      wqiValues.forEach(wqi => {
        for (const [range, bounds] of Object.entries(ranges)) {
          if (wqi >= bounds.min && wqi <= bounds.max) {
            distribution[range]++;
            break;
          }
        }
      });
  
      return distribution;
    }
  
    calculateParameterCompliance(data, parameter) {
      // This would check against thresholds - placeholder implementation
      const validPoints = data.filter(point => 
        point[parameter] !== null && point[parameter] !== undefined
      ).length;
      
      return {
        total: validPoints,
        compliant: validPoints, // Placeholder
        percentage: 100 // Placeholder
      };
    }
  
    countParameterAlerts(data, parameter) {
      // This would count alerts for the parameter - placeholder
      return {
        total: 0,
        critical: 0,
        warning: 0
      };
    }
  
    getParameterRecommendation(parameter, trend) {
      const recommendations = {
        pH: {
          increasing: 'Consider pH adjustment or check alkalinity levels',
          decreasing: 'Monitor acid levels and dosing systems'
        },
        temperature: {
          increasing: 'Check cooling systems and reduce heat sources',
          decreasing: 'Verify heating systems are functioning properly'
        },
        turbidity: {
          increasing: 'Check filtration systems and upstream conditions',
          decreasing: 'Good trend, continue current practices'
        },
        salinity: {
          increasing: 'Check dilution systems and evaporation rates',
          decreasing: 'Monitor for excessive dilution'
        }
      };
  
      return recommendations[parameter]?.[trend] || `Monitor ${parameter} closely`;
    }
  
    generateEmptyReport(timeFilter, dateRange) {
      return {
        timeFilter,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
          label: this.getDateRangeLabel(timeFilter, dateRange)
        },
        summary: { dataPoints: 0, timeSpan: null, coverage: 0, quality: 'no-data' },
        wqi: { overall: null, trend: null, distribution: null },
        parameters: {},
        trends: {},
        chartData: { labels: [], datasets: [] },
        insights: [{
          type: 'warning',
          title: 'No Data Available',
          message: 'No sensor data available for the selected time period.',
          priority: 'high'
        }],
        metadata: {
          generatedAt: new Date().toISOString(),
          dataQuality: 'no-data',
          completeness: 0
        }
      };
    }
  }