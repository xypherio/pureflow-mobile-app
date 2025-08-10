/**
 * Performance monitoring utilities for the PureFlow app
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.isEnabled = __DEV__; // Only enable in development
  }

  /**
   * Start timing an operation
   * @param {string} operation - Name of the operation
   */
  startTiming(operation) {
    if (!this.isEnabled) return;
    
    this.metrics.set(operation, {
      startTime: Date.now(),
      endTime: null,
      duration: null,
    });
  }

  /**
   * End timing an operation and log the result
   * @param {string} operation - Name of the operation
   * @returns {number} Duration in milliseconds
   */
  endTiming(operation) {
    if (!this.isEnabled) return 0;
    
    const metric = this.metrics.get(operation);
    if (!metric) {
      console.warn(`⚠️ No timing started for operation: ${operation}`);
      return 0;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`⏱️ ${operation}: ${metric.duration}ms`);
    return metric.duration;
  }

  /**
   * Measure the execution time of an async function
   * @param {string} operation - Name of the operation
   * @param {Function} fn - Async function to measure
   * @returns {Promise<any>} Result of the function
   */
  async measureAsync(operation, fn) {
    if (!this.isEnabled) return await fn();
    
    this.startTiming(operation);
    try {
      const result = await fn();
      this.endTiming(operation);
      return result;
    } catch (error) {
      this.endTiming(operation);
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   * @returns {Object} All metrics
   */
  getMetrics() {
    if (!this.isEnabled) return {};
    
    const result = {};
    for (const [operation, metric] of this.metrics.entries()) {
      result[operation] = {
        duration: metric.duration,
        startTime: metric.startTime,
        endTime: metric.endTime,
      };
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Log memory usage (React Native specific)
   */
  logMemoryUsage() {
    if (!this.isEnabled) return;
    
    if (global.performance && global.performance.memory) {
      const memory = global.performance.memory;
      console.log('🧠 Memory Usage:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
