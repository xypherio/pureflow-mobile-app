// ServiceInitializationManager - Orchestrates service initialization phases
// Breaks down the large ServiceContainer initialization into manageable phases

import {
  SERVICE_CONTAINER_CONFIG,
  SERVICE_LOGGING_CONFIG
} from '../../constants/services.js';
import {
  coreServicesFactory,
  dataServicesFactory,
  cachingServicesFactory,
  notificationServicesFactory,
  processingServicesFactory,
  facadeServicesFactory
} from './ServiceFactory.js';

export class ServiceInitializationManager {
  constructor() {
    this.createdServices = new Map();
    this.initializationPhase = 'uninitialized';
    this.initializationStartTime = null;
    this.servicesConfig = {
      legacyServices: new Map(),
      healthCheckInterval: null
    };

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🧪 ServiceInitializationManager created');
    }
  }

  /**
   * Initialize all services in proper dependency order
   * @returns {Promise<Object>} Initialization result with service references
   */
  async initializeAllServices() {
    if (this.initializationPhase !== 'uninitialized') {
      console.log('⚠️ Services already initialized');
      return this.getServiceRegistry();
    }

    this.initializationStartTime = performance.now();

    try {
      this.setPhase('starting');
      console.log('🚀 Starting service initialization...');

      // Phase 1: Core Services
      this.setPhase('core_services');
      console.log('1️⃣ Core Services Phase...');
      const coreServices = await coreServicesFactory.createAll();
      this.registerServices(coreServices);

      // Phase 2: Data Services
      this.setPhase('data_services');
      console.log('2️⃣ Data Services Phase...');
      const dataServices = await dataServicesFactory.createAll();
      this.registerServices(dataServices);

      // Phase 3: Caching Services
      this.setPhase('caching_services');
      console.log('3️⃣ Caching Services Phase...');
      const cachingServices = await cachingServicesFactory.createAll();
      this.registerServices(cachingServices);

      // Phase 4: Notification Services
      this.setPhase('notification_services');
      console.log('4️⃣ Notification Services Phase...');
      const thresholdManager = this.getService('thresholdManager');
      const notificationServices = await notificationServicesFactory.createAll(thresholdManager);
      this.registerServices(notificationServices);

      // Phase 5: Processing Services
      this.setPhase('processing_services');
      console.log('5️⃣ Processing Services Phase...');
      const processingServices = await processingServicesFactory.createAll(
        this.getService('alertRepository'),
        this.getService('dataCacheService'),
        this.getService('thresholdManager')
      );
      this.registerServices(processingServices);

      // Phase 6: Facade Services
      this.setPhase('facade_services');
      console.log('6️⃣ Facade Services Phase...');
      const allServices = this.getServiceRegistry();
      const facadeServices = await facadeServicesFactory.createAll(allServices);
      this.registerServices(facadeServices);

      // Phase 7: Monitoring & Validation
      this.setPhase('monitoring_setup');
      console.log('7️⃣ Monitoring Setup Phase...');
      await this.setupMonitoringAndValidation();

      // Phase 8: Legacy Adapters
      this.setPhase('legacy_adapters');
      console.log('8️⃣ Legacy Adapters Phase...');
      await this.initializeLegacyServices();

      // Phase 9: Post-Initialization
      this.setPhase('post_initialization');
      console.log('9️⃣ Post-Initialization Phase...');
      await this.postInitializeServices();

      this.setPhase('completed');
      const duration = Math.round(performance.now() - this.initializationStartTime);

      console.log(`✅✅✅ All services initialized successfully in ${duration}ms`);

      return this.getServiceRegistry();

    } catch (error) {
      this.setPhase('failed');
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register services in the manager
   * @param {Object} services - Object containing services to register
   */
  registerServices(services) {
    Object.entries(services).forEach(([name, service]) => {
      if (service) {
        this.createdServices.set(name, service);

        if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
          console.log(`📝 Service registered: ${name}`);
        }
      }
    });
  }

  /**
   * Get a service by name
   * @param {string} serviceName - Name of service to retrieve
   * @returns {*} Service instance or undefined
   */
  getService(serviceName) {
    return this.createdServices.get(serviceName);
  }

  /**
   * Check if service exists
   * @param {string} serviceName - Service to check
   * @returns {boolean} Whether service exists
   */
  hasService(serviceName) {
    return this.createdServices.has(serviceName);
  }

  /**
   * Get service registry for facades
   * @returns {Object} Service registry object
   */
  getServiceRegistry() {
    const registry = {};
    for (const [key, service] of this.createdServices.entries()) {
      registry[key] = service;
    }
    return registry;
  }

  /**
   * Set current initialization phase
   * @param {string} phase - Initialization phase
   */
  setPhase(phase) {
    this.initializationPhase = phase;

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log(`📍 Phase: ${phase}`);
    }
  }

  /**
   * Setup monitoring and validation
   */
  async setupMonitoringAndValidation() {
    const performanceMonitor = await this.createPerformanceMonitor();

    // Schedule cache maintenance
    this.scheduleCacheMaintenance();

    // Setup health monitoring
    this.setupHealthMonitoring();

    return { performanceMonitor };
  }

  /**
   * Create performance monitor
   */
  async createPerformanceMonitor() {
    try {
      const { performanceMonitor } = await import('../../services/PerformanceMonitor');
      this.registerServices({ performanceMonitor });
      return performanceMonitor;
    } catch (error) {
      console.warn('⚠️ PerformanceMonitor not available:', error.message);
      return null;
    }
  }

  /**
   * Schedule periodic cache maintenance
   */
  scheduleCacheMaintenance() {
    const dataCacheService = this.getService('dataCacheService');

    if (dataCacheService) {
      setInterval(async () => {
        try {
          await dataCacheService.performMaintenance();
          if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
            console.log('🧹 Scheduled cache maintenance completed');
          }
        } catch (error) {
          console.error('❌ Error in scheduled cache maintenance:', error);
        }
      }, SERVICE_CONTAINER_CONFIG.CACHE_MAINTENANCE_INTERVAL_MS);
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    this.servicesConfig.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, SERVICE_CONTAINER_CONFIG.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Perform health check on services
   */
  async performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      phase: this.initializationPhase,
      services: {},
      overall: 'healthy'
    };

    try {
      // Check core services
      health.services.thresholdManager = !!this.getService('thresholdManager');
      health.services.alertEngine = !!this.getService('alertEngine');
      health.services.waterQualityCalculator = !!this.getService('waterQualityCalculator');

      // Check data services
      health.services.sensorDataRepository = !!this.getService('sensorDataRepository');
      health.services.alertRepository = !!this.getService('alertRepository');
      health.services.dataAggregationService = !!this.getService('dataAggregationService');

      // Check caching
      const cacheService = this.getService('dataCacheService');
      if (cacheService && cacheService.getCacheStatus) {
        const cacheStatus = await cacheService.getCacheStatus();
        health.services.cache = cacheStatus.memorySize > 0 ? 'healthy' : 'warning';
        health.services.cacheMemorySize = cacheStatus.memorySize;
      } else {
        health.services.cache = 'unavailable';
      }

      // Check notification services
      health.services.notificationService = !!this.getService('notificationService');
      health.services.waterQualityNotifier = !!this.getService('waterQualityNotifier');

      // Check facades
      health.services.dashboardDataFacade = !!this.getService('dashboardDataFacade');
      health.services.alertManagementFacade = !!this.getService('alertManagementFacade');
      health.services.reportsDataFacade = !!this.getService('reportsDataFacade');

      // Determine overall health
      const serviceStates = Object.values(health.services);
      if (serviceStates.includes(false) || serviceStates.includes('unavailable')) {
        health.overall = 'critical';
      } else if (serviceStates.includes('warning')) {
        health.overall = 'warning';
      }

      if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
        console.log(`🏥 Health check: ${health.overall} (${this.createdServices.size} services)`);
      }

      return health;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      health.overall = 'error';
      health.error = error.message;
      return health;
    }
  }

  /**
   * Initialize legacy services for backward compatibility
   */
  async initializeLegacyServices() {
    try {
      // Import legacy services
      const { historicalDataService } = await import('../../services/historicalDataService');
      const { realtimeDataService } = await import('../../services/realtimeDataService');
      const { waterQualityNotificationService } = await import('../../services/WaterQualityNotificationService');

      // Register legacy services
      this.registerServices({
        historicalDataService,
        realtimeDataService,
        waterQualityNotificationService
      });

      this.servicesConfig.legacyServices.set('historicalDataService', true);
      this.servicesConfig.legacyServices.set('realtimeDataService', true);
      this.servicesConfig.legacyServices.set('waterQualityNotificationService', true);

    } catch (error) {
      console.warn('⚠️ Some legacy services not available:', error.message);
    }
  }

  /**
   * Post-initialize services that need to reference other services
   */
  async postInitializeServices() {
    try {
      // Post-initialize legacy services
      const historicalDataService = this.getService('historicalDataService');
      if (historicalDataService && historicalDataService.postInitialize) {
        const dataCacheService = this.getService('dataCacheService');
        if (dataCacheService) {
          historicalDataService.postInitialize(dataCacheService);
        }
      }

      const realtimeDataService = this.getService('realtimeDataService');
      if (realtimeDataService && realtimeDataService.postInitialize) {
        const dashboardFacade = this.getService('dashboardDataFacade');
        const performanceMonitor = this.getService('performanceMonitor');
        if (dashboardFacade) {
          realtimeDataService.postInitialize(dashboardFacade, performanceMonitor);
        }
      }

      const waterQualityNotificationService = this.getService('waterQualityNotificationService');
      if (waterQualityNotificationService && waterQualityNotificationService.postInitialize) {
        const alertFacade = this.getService('alertManagementFacade');
        const waterQualityNotifier = this.getService('waterQualityNotifier');
        const thresholdManager = this.getService('thresholdManager');
        const notificationService = this.getService('notificationService');

        if (alertFacade && notificationService) {
          waterQualityNotificationService.postInitialize(
            alertFacade,
            waterQualityNotifier,
            thresholdManager,
            notificationService,
            null // scheduledNotificationManager can be null
          );
        }
      }

    } catch (error) {
      console.warn('⚠️ Some post-initialization steps failed:', error.message);
    }
  }

  /**
   * Get initialization statistics
   * @returns {Object} Statistics about initialization
   */
  getStatistics() {
    const duration = this.initializationStartTime ?
      Math.round(performance.now() - this.initializationStartTime) : 0;

    return {
      phase: this.initializationPhase,
      totalServices: this.createdServices.size,
      duration,
      services: Array.from(this.createdServices.keys()),
      legacyServices: Array.from(this.servicesConfig.legacyServices.keys())
    };
  }

  /**
   * Cleanup all services and intervals
   */
  async cleanup() {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🧹 Cleaning up ServiceInitializationManager...');
    }

    // Clear health check interval
    if (this.servicesConfig.healthCheckInterval) {
      clearInterval(this.servicesConfig.healthCheckInterval);
      this.servicesConfig.healthCheckInterval = null;
    }

    // Clear cache
    try {
      const cacheManager = this.getService('cacheManager');
      if (cacheManager && cacheManager.cleanAll) {
        await cacheManager.cleanAll();
      }
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }

    // Clear service references
    this.createdServices.clear();

    this.setPhase('cleaned');

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ ServiceInitializationManager cleaned up');
    }
  }

  /**
   * Get main facade services for external access
   * @returns {Object} Facade services
   */
  getFacades() {
    return {
      dashboard: this.getService('dashboardDataFacade'),
      alerts: this.getService('alertManagementFacade'),
      reports: this.getService('reportsDataFacade')
    };
  }

  /**
   * Get service status report
   * @returns {Object} Status of all services
   */
  getServiceStatus() {
    const status = {};
    for (const [name, service] of this.createdServices.entries()) {
      status[name] = {
        registered: true,
        type: service.constructor.name,
        available: !!service
      };
    }
    return status;
  }
}

// Export singleton instance
export const serviceInitializationManager = new ServiceInitializationManager();
export default serviceInitializationManager;
