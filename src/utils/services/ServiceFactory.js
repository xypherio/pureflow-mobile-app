// Service Factory - Creates and configures services with proper dependencies
// Breaks down the large ServiceContainer into focused factories

import {
  SERVICE_CONTAINER_CONFIG,
  SERVICE_LOGGING_CONFIG
} from '../../constants/services.js';

// Service Factory for creating specific service types
export class ServiceFactory {
  constructor() {
    this.createdServices = new Map();

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 ServiceFactory initialized');
    }
  }

  /**
   * Get or create a service instance
   * @param {string} serviceKey - Unique service identifier
   * @param {Function} factoryFn - Factory function that creates the service
   * @param {Array} dependencies - Service dependencies
   * @returns {Object} - Created service instance
   */
  getOrCreateService(serviceKey, factoryFn, dependencies = []) {
    if (this.createdServices.has(serviceKey)) {
      if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
        console.log(`🔄 Returning existing service: ${serviceKey}`);
      }
      return this.createdServices.get(serviceKey);
    }

    try {
      const service = factoryFn(...dependencies.map(depKey =>
        this.getOrCreateService(depKey, null, [])
      ));

      if (service) {
        this.createdServices.set(serviceKey, service);
        if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
          console.log(`✅ Created service: ${serviceKey}`);
        }
      }

      return service;
    } catch (error) {
      console.error(`❌ Failed to create service ${serviceKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if a service exists in the factory
   * @param {string} serviceKey - Service key to check
   * @returns {boolean} Whether service exists
   */
  hasService(serviceKey) {
    return this.createdServices.has(serviceKey);
  }

  /**
   * Get service statistics
   * @returns {Object} Factory statistics
   */
  getStatistics() {
    return {
      totalServices: this.createdServices.size,
      services: Array.from(this.createdServices.keys()),
      memoryUsage: JSON.stringify(Object.fromEntries(this.createdServices)).length
    };
  }

  /**
   * Clear all created services
   */
  clear() {
    this.createdServices.clear();
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🧹 ServiceFactory cleared');
    }
  }
}

// Core Services Factory
export class CoreServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createThresholdManager() {
    const { WaterQualityThresholdManager } = await import('../../services/core/WaterQualityThresholdManager');
    return this.getOrCreateService(
      'thresholdManager',
      () => new WaterQualityThresholdManager(),
      []
    );
  }

  async createAlertEngine(thresholdManager) {
    const { AlertEngine } = await import('../../services/core/AlertEngine');
    return this.getOrCreateService(
      'alertEngine',
      () => new AlertEngine(thresholdManager),
      []
    );
  }

  async createWaterQualityCalculator() {
    const { WaterQualityCalculator } = await import('../../services/core/WaterQualityCalculator');
    return this.getOrCreateService(
      'waterQualityCalculator',
      () => new WaterQualityCalculator(),
      []
    );
  }

  async createAll() {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating core services...');
    }

    const thresholdManager = await this.createThresholdManager();
    const alertEngine = await this.createAlertEngine(thresholdManager);
    const waterQualityCalculator = await this.createWaterQualityCalculator();

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Core services created');
    }

    return {
      thresholdManager,
      alertEngine,
      waterQualityCalculator
    };
  }
}

// Data Services Factory
export class DataServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createSensorDataRepository() {
    const { SensorDataRepository } = await import('../../services/data/SensorDataRepository');
    return this.getOrCreateService(
      'sensorDataRepository',
      () => new SensorDataRepository(),
      []
    );
  }

  async createAlertRepository() {
    const { AlertRepository } = await import('../../services/data/AlertRepository');
    return this.getOrCreateService(
      'alertRepository',
      () => new AlertRepository(),
      []
    );
  }

  async createDataAggregationService() {
    const { DataAggregationService } = await import('../../services/data/DataAggregationService');
    return this.getOrCreateService(
      'dataAggregationService',
      () => new DataAggregationService(),
      []
    );
  }

  async createAll() {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating data services...');
    }

    const sensorDataRepository = await this.createSensorDataRepository();
    const alertRepository = await this.createAlertRepository();
    const dataAggregationService = await this.createDataAggregationService();

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Data services created');
    }

    return {
      sensorDataRepository,
      alertRepository,
      dataAggregationService
    };
  }
}

// Caching Services Factory
export class CachingServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createCacheManager() {
    const { CacheManager } = await import('../../services/caching/CacheManager');
    return this.getOrCreateService(
      'cacheManager',
      () => new CacheManager(),
      []
    );
  }

  async createDataCacheService(cacheManager) {
    const { DataCacheService } = await import('../../services/caching/DataCacheService');
    return this.getOrCreateService(
      'dataCacheService',
      () => new DataCacheService(cacheManager),
      []
    );
  }

  async createAll() {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating caching services...');
    }

    const cacheManager = await this.createCacheManager();
    const dataCacheService = await this.createDataCacheService(cacheManager);

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Caching services created');
    }

    return {
      cacheManager,
      dataCacheService
    };
  }
}

// Notification Services Factory
export class NotificationServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createNotificationService() {
    try {
      const NotificationServiceModule = await import('../../services/notifications/NotificationService');
      const NotificationService = NotificationServiceModule.default || NotificationServiceModule.NotificationService;

      const notificationService = new NotificationService();

      // Register local notification providers (work only when app is running)
      const { notificationManager } = await import('../../services/notifications/NotificationManager');
      notificationService.registerProvider('local', {
        send: async (notification) => await notificationManager.sendLocalNotification(notification)
      });
      notificationService.registerProvider('default', {
        send: async (notification) => await notificationManager.sendLocalNotification(notification)
      });

      // Register push notification providers (work even when app is closed)
      const { PushNotificationProvider } = await import('../../services/notifications/PushNotificationProvider');
      const pushProvider = new PushNotificationProvider();

      notificationService.registerProvider('push', {
        send: async (notification) => await pushProvider.send(notification)
      });
      notificationService.registerProvider('push_default', {
        send: async (notification) => await pushProvider.send(notification)
      });

      return this.getOrCreateService(
        'notificationService',
        () => notificationService,
        []
      );
    } catch (error) {
      console.error('❌ Failed to create notification service:', error);
      throw error;
    }
  }

  async createWaterQualityNotifier(notificationService, thresholdManager) {
    try {
      const WaterQualityNotifierModule = await import('../../services/notifications/WaterQualityNotifier');
      const WaterQualityNotifier = WaterQualityNotifierModule.default || WaterQualityNotifierModule.WaterQualityNotifier;

      return this.getOrCreateService(
        'waterQualityNotifier',
        () => new WaterQualityNotifier(notificationService, thresholdManager),
        []
      );
    } catch (error) {
      console.error('❌ Failed to create water quality notifier:', error);
      throw error;
    }
  }

  async createAll(thresholdManager) {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating notification services...');
    }

    const notificationService = await this.createNotificationService();
    const waterQualityNotifier = await this.createWaterQualityNotifier(notificationService, thresholdManager);

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Notification services created');
    }

    return {
      notificationService,
      waterQualityNotifier
    };
  }
}

// Processing Services Factory
export class ProcessingServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createAlertProcessor(alertRepository, dataCacheService, thresholdManager) {
    const { AlertProcessor } = await import('../../services/processing/AlertProcessor');
    return this.getOrCreateService(
      'alertProcessor',
      () => new AlertProcessor(alertRepository, dataCacheService, thresholdManager),
      []
    );
  }

  async createDataProcessor() {
    const { DataProcessor } = await import('../../services/processing/DataProcessor');
    const dataProcessor = new DataProcessor();

    // Add validation and transformation rules
    dataProcessor.addValidationRule('pH', DataProcessor.createRangeValidationRule(0, 14));
    dataProcessor.addValidationRule('temperature', DataProcessor.createRangeValidationRule(-10, 60));
    dataProcessor.addValidationRule('turbidity', DataProcessor.createRangeValidationRule(0, 1000));
    dataProcessor.addValidationRule('salinity', DataProcessor.createRangeValidationRule(0, 100));

    dataProcessor.addTransformationRule('pH', DataProcessor.createRoundingTransformationRule(2));
    dataProcessor.addTransformationRule('temperature', DataProcessor.createRoundingTransformationRule(1));
    dataProcessor.addTransformationRule('turbidity', DataProcessor.createRoundingTransformationRule(1));
    dataProcessor.addTransformationRule('salinity', DataProcessor.createRoundingTransformationRule(1));

    return this.getOrCreateService(
      'dataProcessor',
      () => dataProcessor,
      []
    );
  }

  async createForecastProcessor() {
    const { ForecastProcessor } = await import('../../services/processing/ForecastProcessor');
    return this.getOrCreateService(
      'forecastProcessor',
      () => new ForecastProcessor(),
      []
    );
  }

  async createAll(alertRepository, dataCacheService, thresholdManager) {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating processing services...');
    }

    const alertProcessor = await this.createAlertProcessor(
      alertRepository,
      dataCacheService,
      thresholdManager
    );
    const dataProcessor = await this.createDataProcessor();
    const forecastProcessor = await this.createForecastProcessor();

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Processing services created');
    }

    return {
      alertProcessor,
      dataProcessor,
      forecastProcessor
    };
  }
}

// Facade Services Factory
export class FacadeServicesFactory extends ServiceFactory {
  constructor() {
    super();
  }

  async createDashboardDataFacade(services) {
    const { DashboardDataFacade } = await import('../../services/facades/DashboardDataFacade');
    return this.getOrCreateService(
      'dashboardDataFacade',
      () => new DashboardDataFacade({
        sensorDataRepository: services.sensorDataRepository,
        alertRepository: services.alertRepository,
        dataAggregationService: services.dataAggregationService,
        waterQualityCalculator: services.waterQualityCalculator,
        dataCacheService: services.dataCacheService,
        alertProcessor: services.alertProcessor,
        dataProcessor: services.dataProcessor
      }),
      []
    );
  }

  async createAlertManagementFacade(services) {
    const { AlertManagementFacade } = await import('../../services/facades/AlertManagementFacade');
    return this.getOrCreateService(
      'alertManagementFacade',
      () => new AlertManagementFacade({
        alertEngine: services.alertEngine,
        alertProcessor: services.alertProcessor,
        alertRepository: services.alertRepository,
        waterQualityNotifier: services.waterQualityNotifier,
        thresholdManager: services.thresholdManager,
        dataCacheService: services.dataCacheService
      }),
      []
    );
  }

  async createReportsDataFacade(services) {
    const { ReportsDataFacade } = await import('../../services/facades/ReportsDataFacade');
    return this.getOrCreateService(
      'reportsDataFacade',
      () => new ReportsDataFacade({
        sensorDataRepository: services.sensorDataRepository,
        dataAggregationService: services.dataAggregationService,
        waterQualityCalculator: services.waterQualityCalculator,
        dataCacheService: services.dataCacheService,
        dataProcessor: services.dataProcessor
      }),
      []
    );
  }

  async createAll(services) {
    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('🏭 Creating facade services...');
    }

    const dashboardDataFacade = await this.createDashboardDataFacade(services);
    const alertManagementFacade = await this.createAlertManagementFacade(services);
    const reportsDataFacade = await this.createReportsDataFacade(services);

    if (SERVICE_LOGGING_CONFIG.ENABLE_DETAILED_LOGGING) {
      console.log('✅ Facade services created');
    }

    return {
      dashboardDataFacade,
      alertManagementFacade,
      reportsDataFacade
    };
  }
}

// Export factory instances
export const coreServicesFactory = new CoreServicesFactory();
export const dataServicesFactory = new DataServicesFactory();
export const cachingServicesFactory = new CachingServicesFactory();
export const notificationServicesFactory = new NotificationServicesFactory();
export const processingServicesFactory = new ProcessingServicesFactory();
export const facadeServicesFactory = new FacadeServicesFactory();
