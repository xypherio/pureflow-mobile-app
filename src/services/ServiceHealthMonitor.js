/**
 * Service Health Monitor
 *
 * Monitors the health of application services, provides diagnostics,
 * and implements graceful degradation strategies.
 */

class ServiceHealthMonitor {
  constructor(serviceContainer) {
    this.serviceContainer = serviceContainer;
    this.healthStatus = new Map();
    this.degradationStrategies = new Map();
    this.monitorInterval = null;
    this.isMonitoring = false;

    // Setup default degradation strategies
    this.setupDegradationStrategies();

    console.log('💊 ServiceHealthMonitor constructed');
  }

  /**
   * Start health monitoring
   */
  startMonitoring(intervalMs = 30000) { // 30 seconds default
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    console.log(`💊 Started service health monitoring (every ${intervalMs}ms)`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log('💊 Stopped service health monitoring');
  }

  /**
   * Perform comprehensive health check on all services
   */
  async performHealthCheck() {
    const healthReport = {
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy',
      degradationLevel: 'none',
      recommendations: []
    };

    try {
      // Check core services first
      await this.checkCoreServices(healthReport);

      // Check data services
      await this.checkDataServices(healthReport);

      // Check processing services
      await this.checkProcessingServices(healthReport);

      // Check facade services
      await this.checkFacadeServices(healthReport);

      // Determine overall health and degradation level
      this.determineOverallHealth(healthReport);

      // Apply degradation strategies if needed
      await this.applyDegradationStrategies(healthReport);

      // Store health status
      this.healthStatus = new Map(Object.entries(healthReport.services));

      console.log(`💊 Health check: ${healthReport.overall} (degradation: ${healthReport.degradationLevel})`);

      if (healthReport.recommendations.length > 0) {
        console.warn('💊 Health recommendations:', healthReport.recommendations);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      healthReport.overall = 'critical';
      healthReport.error = error.message;
    }

    return healthReport;
  }

  async checkCoreServices(healthReport) {
    const coreServices = ['thresholdManager', 'alertEngine', 'waterQualityCalculator'];

    for (const serviceName of coreServices) {
      try {
        const service = this.serviceContainer.services.get(serviceName);
        healthReport.services[serviceName] = service ? 'healthy' : 'unavailable';
      } catch (error) {
        healthReport.services[serviceName] = 'unavailable';
      }
    }
  }

  async checkDataServices(healthReport) {
    const dataServices = ['sensorDataRepository', 'alertRepository', 'dataAggregationService'];

    for (const serviceName of dataServices) {
      try {
        const service = this.serviceContainer.services.get(serviceName);
        if (!service) {
          healthReport.services[serviceName] = 'unavailable';
          continue;
        }

        // Try a simple operation if available
        let status = 'healthy';
        if (service.getStatus) {
          try {
            const serviceStatus = await service.getStatus();
            status = serviceStatus.healthy ? 'healthy' : 'degraded';
          } catch (error) {
            status = 'warning';
          }
        }

        healthReport.services[serviceName] = status;
      } catch (error) {
        healthReport.services[serviceName] = 'unavailable';
      }
    }
  }

  async checkProcessingServices(healthReport) {
    const processingServices = ['alertProcessor', 'dataProcessor', 'forecastProcessor'];

    for (const serviceName of processingServices) {
      try {
        const service = this.serviceContainer.services.get(serviceName);
        healthReport.services[serviceName] = service ? 'healthy' : 'unavailable';
      } catch (error) {
        healthReport.services[serviceName] = 'unavailable';
      }
    }
  }

  async checkFacadeServices(healthReport) {
    const facadeServices = ['dashboardDataFacade', 'alertManagementFacade', 'reportsDataFacade'];

    for (const serviceName of facadeServices) {
      try {
        const service = this.serviceContainer.services.get(serviceName);
        healthReport.services[serviceName] = service ? 'healthy' : 'unavailable';
      } catch (error) {
        healthReport.services[serviceName] = 'unavailable';
      }
    }
  }

  determineOverallHealth(healthReport) {
    const services = Object.values(healthReport.services);

    // Count service states
    const criticalCount = services.filter(s => s === 'unavailable').length;
    const warningCount = services.filter(s => s === 'warning' || s === 'degraded').length;

    // Determine overall health and degradation level
    if (criticalCount > 0) {
      healthReport.overall = criticalCount > services.length * 0.5 ? 'critical' : 'degraded';
      healthReport.degradationLevel = criticalCount > 3 ? 'high' : 'medium';
    } else if (warningCount > 0) {
      healthReport.overall = 'warning';
      healthReport.degradationLevel = 'low';
    }

    // Generate recommendations
    if (healthReport.overall !== 'healthy') {
      this.generateRecommendations(healthReport);
    }
  }

  generateRecommendations(healthReport) {
    const unavailableServices = Object.entries(healthReport.services)
      .filter(([name, status]) => status === 'unavailable')
      .map(([name]) => name);

    if (unavailableServices.length > 0) {
      healthReport.recommendations.push(`Restart app - missing ${unavailableServices.length} services: ${unavailableServices.join(', ')}`);
    }

    const degradedServices = Object.entries(healthReport.services)
      .filter(([name, status]) => status === 'degraded' || status === 'warning')
      .map(([name]) => name);

    if (degradedServices.length > 0) {
      healthReport.recommendations.push(`Monitor performance - degraded services: ${degradedServices.join(', ')}`);
    }

    const criticalDependencies = ['alertEngine', 'notificationService', 'dataCacheService'];
    const criticalIssues = unavailableServices.filter(s => criticalDependencies.includes(s));

    if (criticalIssues.length > 0) {
      healthReport.recommendations.push('Manual intervention required - critical services unavailable');
    }
  }

  setupDegradationStrategies() {
    // Strategy for when cache is unavailable
    this.degradationStrategies.set('cache', {
      condition: (health) => health.services.dataCacheService === 'unavailable',
      action: () => {
        console.log('🔄 Activating cache degradation - operations will be slower');
        // Could set app to offline mode or reduce cache dependencies
      }
    });

    // Strategy for when notification services are degraded
    this.degradationStrategies.set('notifications', {
      condition: (health) => health.services.notificationService !== 'healthy',
      action: () => {
        console.log('🔄 Activating notification degradation - alerts may not be sent');
        // Could show in-app notifications only
      }
    });

    // Strategy for when data services are unavailable
    this.degradationStrategies.set('data', {
      condition: (health) => {
        const dataServices = ['sensorDataRepository', 'alertRepository'];
        return dataServices.some(s => health.services[s] === 'unavailable');
      },
      action: () => {
        console.log('🔄 Activating data degradation - limited functionality');
        // Could show "offline mode" UI
      }
    });
  }

  async applyDegradationStrategies(healthReport) {
    for (const [strategyName, strategy] of this.degradationStrategies) {
      if (strategy.condition(healthReport)) {
        try {
          await strategy.action();
        } catch (error) {
          console.error(`❌ Failed to apply degradation strategy "${strategyName}":`, error);
        }
      }
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastCheck: new Date().toISOString(),
      services: Object.fromEntries(this.healthStatus),
      totalServices: this.healthStatus.size
    };
  }

  /**
   * Force a service restart (if possible)
   */
  async restartService(serviceName) {
    try {
      console.log(`🔄 Attempting to restart service: ${serviceName}`);

      // Try to clean up the service
      if (this.serviceContainer.services.has(serviceName)) {
        const service = this.serviceContainer.services.get(serviceName);
        if (service.cleanup) {
          await service.cleanup();
        }
        this.serviceContainer.services.delete(serviceName);
      }

      // Try reinitialization based on service type
      let success = false;
      switch (serviceName) {
        case 'dataCacheService':
          await this.reinitializeCacheService();
          success = this.serviceContainer.services.has('dataCacheService');
          break;
        default:
          console.log(`⏭️ No specific restart logic for ${serviceName}`);
      }

      return { success, message: success ? 'Service restarted' : 'Restart not available' };

    } catch (error) {
      console.error(`❌ Failed to restart service ${serviceName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async reinitializeCacheService() {
    try {
      const { DataCacheService } = await import('./caching/DataCacheService');
      const { CacheManager } = await import('./caching/CacheManager');

      const cacheManager = new CacheManager();
      this.serviceContainer.register('cacheManager', cacheManager);

      const dataCacheService = new DataCacheService(cacheManager);
      this.serviceContainer.register('dataCacheService', dataCacheService);

      console.log('✅ Cache service reinitialized');
    } catch (error) {
      console.error('❌ Cache service reinitialization failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const serviceHealthMonitor = new ServiceHealthMonitor();
