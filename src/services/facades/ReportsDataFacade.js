/**
 * ReportsDataFacade.js
 * 
 * A facade that provides a unified interface for generating comprehensive water quality reports.
 * Handles data retrieval, processing, aggregation, and formatting for various report types.
 * 
 * Responsibilities:
 * - Generate reports for different time periods (daily, weekly, monthly, annually)
 * - Process and aggregate sensor data for reporting
 * - Calculate water quality metrics and statistics
 * - Generate insights and recommendations
 * - Prepare data for visualization
 * - Handle data caching and performance optimization
 * 
 * @module ReportsDataFacade
 */

import { performanceMonitor } from '@utils/performance-monitor';

/**
 * Provides a high-level interface for generating and managing water quality reports.
 * Handles the entire report generation pipeline from data retrieval to final formatting.
 */
export class ReportsDataFacade {
    /**
     * Creates a new ReportsDataFacade instance.
     * 
     * @param {Object} dependencies - Required dependencies
     * @param {Object} dependencies.sensorDataRepository - Repository for accessing sensor data
     * @param {Object} dependencies.dataAggregationService - Service for data aggregation and analysis
     * @param {Object} dependencies.waterQualityCalculator - Service for calculating water quality metrics
     * @param {Object} dependencies.dataCacheService - Service for caching report data
     * @param {Object} dependencies.dataProcessor - Service for processing and validating sensor data
     */
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
     * Generates a comprehensive water quality report for the specified time period.
     * 
     * This method orchestrates the entire report generation process:
     * 1. Determines the date range based on the time filter
     * 2. Checks for cached report data
     * 3. Fetches and processes raw sensor data if no cache is available
     * 4. Aggregates data based on the time filter
     * 5. Generates the final report with metrics and insights
     * 
     * @param {string} timeFilter - The time period for the report ('daily', 'weekly', 'monthly', 'annually')
     * @param {Object} [customDateRange=null] - Optional custom date range { start: Date, end: Date }
     * @returns {Promise<Object>} The generated report containing:
     * @property {string} timeFilter - The time period filter used
     * @property {Object} dateRange - The actual date range of the report
     * @property {Object} summary - Summary statistics
     * @property {Object} wqi - Water Quality Index metrics
     * @property {Object} parameters - Analysis of individual parameters
     * @property {Object} trends - Trend analysis
     * @property {Object} chartData - Data formatted for charts
     * @property {Array} insights - Generated insights and recommendations
     * @property {Object} metadata - Additional report metadata
     * @throws {Error} If report generation fails
     */
    async generateReport(timeFilter, customDateRange = null) {
      return await performanceMonitor.measureAsync('reportsFacade.generateReport', async () => {
        console.log(`📊 Generating ${timeFilter} report...`);

        try {
          // Determine date range
          const dateRange = customDateRange || this.getDateRangeForFilter(timeFilter);

          // Check cache
          const cacheKey = `report_${timeFilter}_${dateRange.start}_${dateRange.end}`;
          const cached = await this.dataCacheService?.getCachedAggregatedData(timeFilter, dateRange);

          if (cached) {
            console.log('📦 Using cached report data');
            return this.processReportData(cached, timeFilter, dateRange);
          }

          // Fetch raw data with error handling
          let rawData = [];
          try {
            rawData = await this.sensorDataRepository?.getByDateRange(
              new Date(dateRange.start),
              new Date(dateRange.end)
            ) || [];
          } catch (error) {
            console.warn('Error fetching raw data, using empty dataset:', error);
            return this.generateEmptyReport(timeFilter, dateRange);
          }

          console.log(`📈 Retrieved ${rawData.length} data points for report`);

          if (!Array.isArray(rawData) || rawData.length === 0) {
            return this.generateEmptyReport(timeFilter, dateRange);
          }

          // Process and validate data
          let processedData = rawData;
          try {
            const processingResult = await this.dataProcessor?.processData(rawData);
            if (processingResult?.processed) {
              processedData = processingResult.processed;
            }
          } catch (error) {
            console.warn('Error processing data, using raw data:', error);
          }

          // Aggregate data based on time filter
          let aggregatedData = processedData;
          try {
            if (this.dataAggregationService?.aggregateByInterval) {
              aggregatedData = this.dataAggregationService.aggregateByInterval(
                processedData,
                this.getAggregationInterval(timeFilter)
              );
            }
          } catch (error) {
            console.warn('Error aggregating data, using processed data:', error);
          }

          // Cache aggregated data
          try {
            if (this.dataCacheService?.cacheAggregatedData) {
              await this.dataCacheService.cacheAggregatedData(timeFilter, dateRange, aggregatedData);
            }
          } catch (error) {
            console.warn('Error caching data:', error);
          }

          // Generate final report
          const report = await this.processReportData(aggregatedData, timeFilter, dateRange);

          console.log(`✅ Report generated: ${report.summary.dataPoints} data points, WQI ${report.wqi.overall}`);
          return report;

        } catch (error) {
          console.error('❌ Error generating report:', error);
          // Return empty report instead of throwing
          return this.generateEmptyReport(timeFilter, customDateRange || this.getDateRangeForFilter(timeFilter));
        }
      });
    }
  
    /**
     * Processes aggregated data into a structured report format.
     * 
     * This method transforms raw aggregated data into a comprehensive report
     * structure with calculated metrics, statistics, and visualizations.
     * 
     * @param {Array} aggregatedData - The aggregated sensor data to process
     * @param {string} timeFilter - The time period filter used for the report
     * @param {Object} dateRange - The date range of the report { start: string, end: string }
     * @returns {Object} The processed report containing:
     * @property {string} timeFilter - The time period filter
     * @property {Object} dateRange - Report date range
     * @property {Object} summary - Data summary and statistics
     * @property {Object} wqi - Water Quality Index metrics
     * @property {Object} parameters - Parameter-specific analysis
     * @property {Object} trends - Trend analysis
     * @property {Object} chartData - Data formatted for visualization
     * @property {Array} insights - Generated insights and recommendations
     * @property {Object} metadata - Report generation metadata
     */
    async processReportData(aggregatedData, timeFilter, dateRange) {
      try {
        if (!Array.isArray(aggregatedData)) {
          console.warn('Invalid aggregated data, generating empty report');
          return this.generateEmptyReport(timeFilter, dateRange);
        }

        const report = {
          timeFilter,
          dateRange: {
            start: dateRange.start,
            end: dateRange.end,
            label: this.getDateRangeLabel(timeFilter, dateRange)
          },
          summary: {},
          wqi: {},
          parameters: {},
          trends: {},
          chartData: { labels: [], datasets: [] },
          insights: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            dataQuality: 'unknown',
            completeness: 0
          }
        };

        // Generate summary with error handling
        try {
          report.summary = this.generateSummary(aggregatedData);
        } catch (error) {
          console.warn('Error generating summary:', error);
          report.summary = { dataPoints: aggregatedData.length, timeSpan: null, coverage: 0, quality: 'error' };
        }

        // Calculate WQI with error handling
        try {
          report.wqi = this.calculateWQIForPeriod(aggregatedData);
        } catch (error) {
          console.warn('Error calculating WQI:', error);
          report.wqi = { overall: null, trend: null, distribution: null };
        }

        // Analyze parameters with error handling
        try {
          report.parameters = this.analyzeParameters(aggregatedData);
        } catch (error) {
          console.warn('Error analyzing parameters:', error);
          report.parameters = {};
        }

        // Analyze trends with error handling
        try {
          report.trends = this.analyzeTrends(aggregatedData);
        } catch (error) {
          console.warn('Error analyzing trends:', error);
          report.trends = {};
        }

        // Prepare chart data with error handling
        try {
          report.chartData = this.prepareChartData(aggregatedData, timeFilter);
        } catch (error) {
          console.warn('Error preparing chart data:', error);
          report.chartData = { labels: [], datasets: [] };
        }

        // Generate insights with error handling
        try {
          report.insights = this.generateInsights(aggregatedData);
        } catch (error) {
          console.warn('Error generating insights:', error);
          report.insights = [{
            type: 'warning',
            title: 'Analysis Error',
            message: 'Unable to generate insights due to data processing error.',
            priority: 'medium'
          }];
        }

        // Set metadata with error handling
        try {
          report.metadata.dataQuality = this.assessDataQuality(aggregatedData);
          report.metadata.completeness = this.calculateDataCompleteness(aggregatedData);
        } catch (error) {
          console.warn('Error setting metadata:', error);
        }

        return report;

      } catch (error) {
        console.error('Critical error in processReportData:', error);
        return this.generateEmptyReport(timeFilter, dateRange);
      }
    }
  
    /**
     * Generates summary statistics for the report data.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {Object} Summary statistics containing:
     * @property {number} dataPoints - Total number of data points
     * @property {Object|null} timeSpan - Time span of the data
     * @property {string} timeSpan.start - Start timestamp
     * @property {string} timeSpan.end - End timestamp
     * @property {string} timeSpan.duration - Human-readable duration
     * @property {number} coverage - Data coverage percentage
     * @property {string} quality - Data quality assessment
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
     * Calculates Water Quality Index (WQI) metrics for the given dataset.
     * 
     * This method calculates the overall WQI, trends, and distribution
     * across the provided data points.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {Object} WQI metrics containing:
     * @property {number|null} overall - Overall WQI score (0-100)
     * @property {number} average - Average WQI score
     * @property {number} min - Minimum WQI value
     * @property {number} max - Maximum WQI value
     * @property {Object} trend - Trend analysis of WQI values
     * @property {Object} distribution - Distribution of WQI across quality categories
     * @property {string} rating - Textual rating of water quality
     */
    calculateWQIForPeriod(data) {
      if (!Array.isArray(data) || data.length === 0) {
        return { overall: null, trend: null, distribution: null, average: 0, min: 0, max: 0, rating: 'No Data' };
      }

      try {
        const wqiValues = [];
        const validData = [];

        // Calculate WQI for each data point
        data.forEach(point => {
          try {
            const wqi = this.waterQualityCalculator?.calculateWQI(point);
            if (wqi && wqi.overall !== null && typeof wqi.overall === 'number') {
              wqiValues.push(wqi.overall);
              validData.push({ ...point, wqi: wqi.overall });
            }
          } catch (error) {
            console.warn('Error calculating WQI for data point:', error);
          }
        });

        if (wqiValues.length === 0) {
          return { overall: null, trend: null, distribution: null, average: 0, min: 0, max: 0, rating: 'Insufficient Data' };
        }

        // Calculate statistics
        const average = wqiValues.reduce((sum, val) => sum + val, 0) / wqiValues.length;
        const min = Math.min(...wqiValues);
        const max = Math.max(...wqiValues);

        // Calculate trend with error handling
        let trend = null;
        try {
          if (this.dataAggregationService?.calculateTrend) {
            trend = this.dataAggregationService.calculateTrend(validData, 'wqi');
          }
        } catch (error) {
          console.warn('Error calculating WQI trend:', error);
        }

        // Calculate distribution with error handling
        let distribution = null;
        try {
          distribution = this.calculateWQIDistribution(wqiValues);
        } catch (error) {
          console.warn('Error calculating WQI distribution:', error);
          distribution = {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
            veryPoor: 0
          };
        }

        return {
          overall: Math.round(average),
          average: Math.round(average * 100) / 100,
          min,
          max,
          trend,
          distribution,
          rating: this.waterQualityCalculator?.getRating(average) || 'Unknown'
        };

      } catch (error) {
        console.error('Error in calculateWQIForPeriod:', error);
        return { overall: null, trend: null, distribution: null, average: 0, min: 0, max: 0, rating: 'Error' };
      }
    }
  
    /**
     * Analyzes individual water quality parameters in the dataset.
     * 
     * For each parameter (pH, temperature, turbidity, salinity), calculates:
     * - Basic statistics (min, max, average, standard deviation)
     * - Compliance with quality standards
     * - Alert counts and trends
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {Object} Analysis results keyed by parameter name
     */
    analyzeParameters(data) {
      if (!Array.isArray(data) || data.length === 0) {
        return {
          pH: { statistics: null, trend: null, compliance: null, alerts: null },
          temperature: { statistics: null, trend: null, compliance: null, alerts: null },
          turbidity: { statistics: null, trend: null, compliance: null, alerts: null },
          salinity: { statistics: null, trend: null, compliance: null, alerts: null }
        };
      }

      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const analysis = {};

      parameters.forEach(param => {
        try {
          const stats = this.dataAggregationService?.calculateStatistics(data, param);
          const trend = this.dataAggregationService?.calculateTrend(data, param);

          analysis[param] = {
            statistics: stats || null,
            trend: trend || null,
            compliance: this.calculateParameterCompliance(data, param),
            alerts: this.countParameterAlerts(data, param)
          };
        } catch (error) {
          console.warn(`Error analyzing parameter ${param}:`, error);
          analysis[param] = {
            statistics: null,
            trend: null,
            compliance: null,
            alerts: null
          };
        }
      });

      return analysis;
    }
  
    /**
     * Analyzes trends across all water quality parameters.
     * 
     * Identifies increasing, decreasing, or stable trends for each parameter
     * and provides an overall assessment of water quality trends.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {Object} Trend analysis containing:
     * @property {Object} [parameter] - Trend information for each parameter
     * @property {Object} overall - Summary of all parameter trends
     * @property {boolean} overall.improving - Whether most parameters are improving
     * @property {number} overall.stable - Count of stable parameters
     * @property {number} overall.concerning - Count of parameters with concerning trends
     */
    analyzeTrends(data) {
      if (!Array.isArray(data) || data.length === 0) {
        return {
          pH: null,
          temperature: null,
          turbidity: null,
          salinity: null,
          overall: { improving: false, stable: 0, concerning: 0 }
        };
      }

      const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
      const trends = {};

      parameters.forEach(param => {
        try {
          trends[param] = this.dataAggregationService?.calculateTrend(data, param) || null;
        } catch (error) {
          console.warn(`Error analyzing trend for ${param}:`, error);
          trends[param] = null;
        }
      });

      // Overall trend assessment
      const trendDirections = Object.values(trends).filter(t => t && t.trend).map(t => t.trend);
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
     * Prepares data for visualization in charts.
     * 
     * Transforms the dataset into a format suitable for charting libraries,
     * with proper labels and styling for each parameter.
     * 
     * @param {Array} data - The dataset to visualize
     * @param {string} timeFilter - Time period filter for x-axis formatting
     * @returns {Object} Chart-ready data containing:
     * @property {Array} labels - X-axis labels (formatted timestamps)
     * @property {Array} datasets - Chart datasets for each parameter
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
     * Generates insights and recommendations based on the data analysis.
     * 
     * Identifies significant patterns, trends, and potential issues in the data,
     * and provides actionable recommendations for water quality management.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {Array} Array of insight objects, each containing:
     * @property {string} type - Insight type ('info', 'warning', 'critical', 'success')
     * @property {string} title - Short title of the insight
     * @property {string} message - Detailed description
     * @property {string} priority - Priority level ('high', 'medium', 'low')
     * @property {string} [parameter] - Related parameter (if applicable)
     * @property {string} [recommendation] - Suggested action
     */
    generateInsights(data) {
      const insights = [];

      if (!Array.isArray(data) || data.length === 0) {
        insights.push({
          type: 'warning',
          title: 'No Data Available',
          message: 'No data available for the selected time period.',
          priority: 'high'
        });
        return insights;
      }

      try {
        // Analyze each parameter for insights
        const parameters = ['pH', 'temperature', 'turbidity', 'salinity'];

        parameters.forEach(param => {
          try {
            const trend = this.dataAggregationService?.calculateTrend(data, param);
            const stats = this.dataAggregationService?.calculateStatistics(data, param);

            if (!stats) return;

            // Trend insights
            if (trend?.trend === 'increasing' && ['turbidity', 'salinity'].includes(param)) {
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
            if (stats.standardDeviation && stats.mean && stats.standardDeviation > stats.mean * 0.2) {
              insights.push({
                type: 'info',
                title: `High ${param.charAt(0).toUpperCase() + param.slice(1)} Variability`,
                message: `${param} shows high variability, which may indicate system instability.`,
                priority: 'low',
                parameter: param,
                recommendation: 'Monitor system stability and check for external factors affecting ' + param
              });
            }
          } catch (error) {
            console.warn(`Error generating insights for ${param}:`, error);
          }
        });

        // Overall system insights
        try {
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
        } catch (error) {
          console.warn('Error generating WQI insights:', error);
        }

      } catch (error) {
        console.error('Error generating insights:', error);
        insights.push({
          type: 'warning',
          title: 'Analysis Error',
          message: 'Unable to generate insights due to data processing error.',
          priority: 'medium'
        });
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
  
    /**
     * Determines the appropriate aggregation interval based on the time filter.
     * 
     * @param {string} timeFilter - The time period filter
     * @returns {string} The aggregation interval ('2hour', 'daily', 'monthly')
     * @private
     */
    getAggregationInterval(timeFilter) {
      const intervalMap = {
        daily: '2hour',
        weekly: 'daily',
        monthly: 'daily',
        annually: 'monthly'
      };
      return intervalMap[timeFilter] || 'daily';
    }
  
    /**
     * Generates a human-readable label for a date range.
     * 
     * @param {string} timeFilter - The time period filter
     * @param {Object} dateRange - The date range { start: string, end: string }
     * @returns {string} Formatted date range label
     * @private
     */
    getDateRangeLabel(timeFilter, dateRange) {
      const start = new Date(dateRange.start).toLocaleDateString();
      const end = new Date(dateRange.end).toLocaleDateString();
      return `${start} - ${end}`;
    }
  
    /**
     * Formats a datetime string for chart display based on the time filter.
     * 
     * @param {string} datetime - ISO datetime string
     * @param {string} timeFilter - The time period filter
     * @returns {string} Formatted datetime string
     * @private
     */
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
  
    /**
     * Calculates the duration between two timestamps in a human-readable format.
     * 
     * @param {string} start - Start timestamp
     * @param {string} end - End timestamp
     * @returns {string} Formatted duration (e.g., '2 days 5 hours')
     * @private
     */
    calculateDuration(start, end) {
      const duration = new Date(end) - new Date(start);
      const days = Math.floor(duration / (1000 * 60 * 60 * 24));
      const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days} day(s) ${hours} hour(s)`;
      return `${hours} hour(s)`;
    }
  
    /**
     * Calculates the data coverage percentage across all parameters.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {number} Coverage percentage (0-100)
     * @private
     */
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
  
    /**
     * Assesses the overall quality of the dataset.
     * 
     * @param {Array} data - The dataset to assess
     * @returns {string} Quality rating ('excellent', 'good', 'fair', 'poor', 'no-data')
     * @private
     */
    assessDataQuality(data) {
      if (!data || data.length === 0) return 'no-data';
      
      const coverage = this.calculateCoverage(data);
      
      if (coverage >= 90) return 'excellent';
      if (coverage >= 75) return 'good';
      if (coverage >= 50) return 'fair';
      return 'poor';
    }
  
    /**
     * Calculates the data completeness percentage.
     * 
     * @param {Array} data - The dataset to analyze
     * @returns {number} Completeness percentage (0-100)
     * @private
     */
    calculateDataCompleteness(data) {
      return this.calculateCoverage(data);
    }
  
    /**
     * Calculates the distribution of WQI values across quality categories.
     * 
     * @param {Array} wqiValues - Array of WQI scores
     * @returns {Object} Count of values in each quality category
     * @private
     */
    calculateWQIDistribution(wqiValues) {
      if (!Array.isArray(wqiValues) || wqiValues.length === 0) {
        return {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          veryPoor: 0
        };
      }

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
        if (typeof wqi === 'number' && ranges) {
          try {
            for (const [range, bounds] of Object.entries(ranges)) {
              if (wqi >= bounds.min && wqi <= bounds.max) {
                distribution[range]++;
                break;
              }
            }
          } catch (error) {
            console.warn('Error in WQI distribution calculation:', error);
          }
        }
      });

      return distribution;
    }
  
    /**
     * Calculates compliance statistics for a specific parameter.
     * 
     * @param {Array} data - The dataset to analyze
     * @param {string} parameter - The parameter to check
     * @returns {Object} Compliance statistics
     * @private
     */
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
  
    /**
     * Counts alerts for a specific parameter.
     * 
     * @param {Array} data - The dataset to analyze
     * @param {string} parameter - The parameter to check
     * @returns {Object} Alert counts by severity
     * @private
     */
    countParameterAlerts(data, parameter) {
      // This would count alerts for the parameter - placeholder
      return {
        total: 0,
        critical: 0,
        warning: 0
      };
    }
  
    /**
     * Gets a recommendation message for a parameter based on its trend.
     * 
     * @param {string} parameter - The parameter name
     * @param {string} trend - The observed trend ('increasing', 'decreasing')
     * @returns {string} Recommendation message
     * @private
     */
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
  
    /**
     * Generates an empty report structure with default values.
     * 
     * @param {string} timeFilter - The time period filter
     * @param {Object} dateRange - The date range { start: string, end: string }
     * @returns {Object} Empty report structure
     * @private
     */
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