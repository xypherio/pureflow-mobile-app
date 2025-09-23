export class DataAggregationService {
    constructor() {
      this.parameters = ['pH', 'temperature', 'turbidity', 'salinity'];
    }
  
    aggregateByInterval(data, intervalType) {
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
  
      console.log(`🔄 Aggregating ${data.length} data points by ${intervalType}`);
  
      switch (intervalType) {
        case '2hour':
          return this.aggregateBy2Hours(data);
        case 'daily':
          return this.aggregateByDay(data);
        case 'weekly':
          return this.aggregateByWeek(data);
        case 'monthly':
          return this.aggregateByMonth(data);
        default:
          console.warn(`Unknown interval type: ${intervalType}`);
          return data;
      }
    }
  
    aggregateBy2Hours(data) {
      const sortedData = [...data].sort((a, b) => a.datetime - b.datetime);
      const aggregated = {};
  
      sortedData.forEach(reading => {
        if (!this.isValidReading(reading)) return;
  
        const key = this.get2HourKey(reading.datetime);
        
        if (!aggregated[key]) {
          aggregated[key] = this.createAggregationBucket(new Date(key));
        }
  
        this.addToAggregation(aggregated[key], reading);
      });
  
      return this.finalizeBuckets(Object.values(aggregated));
    }
  
    aggregateByDay(data) {
      const sortedData = [...data].sort((a, b) => a.datetime - b.datetime);
      const aggregated = {};
  
      sortedData.forEach(reading => {
        if (!this.isValidReading(reading)) return;
  
        const key = this.getDayKey(reading.datetime);
        
        if (!aggregated[key]) {
          aggregated[key] = this.createAggregationBucket(new Date(key));
        }
  
        this.addToAggregation(aggregated[key], reading);
      });
  
      return this.finalizeBuckets(Object.values(aggregated));
    }
  
    aggregateByWeek(data) {
      const sortedData = [...data].sort((a, b) => a.datetime - b.datetime);
      const aggregated = {};
  
      sortedData.forEach(reading => {
        if (!this.isValidReading(reading)) return;
  
        const key = this.getWeekKey(reading.datetime);
        
        if (!aggregated[key]) {
          aggregated[key] = this.createAggregationBucket(new Date(key));
        }
  
        this.addToAggregation(aggregated[key], reading);
      });
  
      return this.finalizeBuckets(Object.values(aggregated));
    }
  
    aggregateByMonth(data) {
      const sortedData = [...data].sort((a, b) => a.datetime - b.datetime);
      const aggregated = {};
  
      sortedData.forEach(reading => {
        if (!this.isValidReading(reading)) return;
  
        const key = this.getMonthKey(reading.datetime);
        
        if (!aggregated[key]) {
          aggregated[key] = this.createAggregationBucket(new Date(key));
        }
  
        this.addToAggregation(aggregated[key], reading);
      });
  
      return this.finalizeBuckets(Object.values(aggregated));
    }
  
    isValidReading(reading) {
      return reading && 
             reading.datetime && 
             reading.datetime instanceof Date && 
             !isNaN(reading.datetime.getTime());
    }
  
    get2HourKey(datetime) {
      const date = new Date(datetime);
      const hour = Math.floor(date.getHours() / 2) * 2;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0).toISOString();
    }
  
    getDayKey(datetime) {
      const date = new Date(datetime);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    }
  
    getWeekKey(datetime) {
      const date = new Date(datetime);
      const dayOfWeek = date.getDay();
      const mondayDate = new Date(date);
      mondayDate.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate()).toISOString();
    }
  
    getMonthKey(datetime) {
      const date = new Date(datetime);
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    }
  
    createAggregationBucket(datetime) {
      const bucket = {
        datetime,
        count: 0
      };
  
      this.parameters.forEach(param => {
        bucket[param] = { sum: 0, count: 0, values: [] };
      });
  
      return bucket;
    }
  
    addToAggregation(bucket, reading) {
      bucket.count++;
  
      this.parameters.forEach(param => {
        const value = reading[param];
        if (value !== null && value !== undefined && !isNaN(value)) {
          bucket[param].sum += parseFloat(value);
          bucket[param].count++;
          bucket[param].values.push(parseFloat(value));
        }
      });
    }
  
    finalizeBuckets(buckets) {
      return buckets
        .map(bucket => {
          const result = {
            datetime: bucket.datetime,
            count: bucket.count
          };
  
          this.parameters.forEach(param => {
            const paramData = bucket[param];
            if (paramData.count > 0) {
              result[param] = {
                average: paramData.sum / paramData.count,
                min: Math.min(...paramData.values),
                max: Math.max(...paramData.values),
                count: paramData.count
              };
            } else {
              result[param] = null;
            }
          });
  
          return result;
        })
        .sort((a, b) => a.datetime - b.datetime);
    }
  
    // Utility method to get simple averages (backward compatibility)
    getSimpleAverages(aggregatedData) {
      return aggregatedData.map(bucket => {
        const result = {
          datetime: bucket.datetime,
          count: bucket.count
        };
  
        this.parameters.forEach(param => {
          result[param] = bucket[param] ? bucket[param].average : null;
        });
  
        return result;
      });
    }
  
    // Statistical analysis methods
    calculateStatistics(data, parameter) {
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
  
      const values = data
        .map(item => item[parameter])
        .filter(value => value !== null && value !== undefined && !isNaN(value))
        .map(value => parseFloat(value));
  
      if (values.length === 0) {
        return null;
      }
  
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      
      // Calculate variance
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
  
      // Calculate percentiles
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const medianIndex = Math.floor(sorted.length * 0.5);
  
      return {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: parseFloat(mean.toFixed(3)),
        median: sorted[medianIndex],
        q1: sorted[q1Index],
        q3: sorted[q3Index],
        standardDeviation: parseFloat(standardDeviation.toFixed(3)),
        variance: parseFloat(variance.toFixed(3))
      };
    }
  
    // Trend analysis
    calculateTrend(data, parameter) {
      if (!Array.isArray(data) || data.length < 2) {
        return { trend: 'insufficient_data', slope: 0 };
      }
  
      const validData = data
        .filter(item => 
          item[parameter] !== null && 
          item[parameter] !== undefined && 
          !isNaN(item[parameter]) &&
          item.datetime
        )
        .map((item, index) => ({
          x: index,
          y: parseFloat(item[parameter]),
          datetime: item.datetime
        }));
  
      if (validData.length < 2) {
        return { trend: 'insufficient_data', slope: 0 };
      }
  
      // Calculate linear regression
      const n = validData.length;
      const sumX = validData.reduce((sum, point) => sum + point.x, 0);
      const sumY = validData.reduce((sum, point) => sum + point.y, 0);
      const sumXY = validData.reduce((sum, point) => sum + (point.x * point.y), 0);
      const sumXX = validData.reduce((sum, point) => sum + (point.x * point.x), 0);
  
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
  
      // Determine trend direction
      let trend = 'stable';
      if (Math.abs(slope) > 0.01) { // Threshold for significance
        trend = slope > 0 ? 'increasing' : 'decreasing';
      }
  
      return {
        trend,
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(4)),
        correlation: this.calculateCorrelation(validData)
      };
    }
  
    calculateCorrelation(data) {
      if (data.length < 2) return 0;
  
      const n = data.length;
      const sumX = data.reduce((sum, point) => sum + point.x, 0);
      const sumY = data.reduce((sum, point) => sum + point.y, 0);
      const sumXY = data.reduce((sum, point) => sum + (point.x * point.y), 0);
      const sumXX = data.reduce((sum, point) => sum + (point.x * point.x), 0);
      const sumYY = data.reduce((sum, point) => sum + (point.y * point.y), 0);
  
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
      return denominator === 0 ? 0 : parseFloat((numerator / denominator).toFixed(4));
    }
  }
  