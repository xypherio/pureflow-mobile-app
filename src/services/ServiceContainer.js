import AsyncStorage from '@react-native-async-storage/async-storage';

// Core services
import { WaterQualityThresholdManager } from './core/WaterQualityThresholdManager';
import { AlertEngine } from './core/AlertEngine';
import { WaterQualityCalculator } from './core/WaterQualityCalculator';

// Data layer
import { SensorDataRepository } from './data/SensorDataRepository';
import { AlertRepository } from './data/AlertRepository';
import { DataAggregationService } from './data/DataAggregationService';

// Notification layer - imported dynamically to avoid circular dependencies

// Caching layer
import { CacheManager } from './caching/CacheManager';
import { DataCacheService } from './caching/DataCacheService';

// Processing layer
import { AlertProcessor } from './processing/AlertProcessor';
import { DataProcessor } from './processing/DataProcessor';
import { ForecastProcessor } from './processing/ForecastProcessor';

// Facade layer
import { DashboardDataFacade } from './facades/DashboardDataFacade';
import { AlertManagementFacade } from './facades/AlertManagementFacade';
import { ReportsDataFacade } from './facades/ReportsDataFacade';

// Legacy imports (for backward compatibility during migration)
import { notificationManager } from './notifications/NotificationManager';
import { scheduledNotificationManager } from './notifications/ScheduledNotificationManager';
import { performanceMonitor } from './PerformanceMonitor';
import { historicalDataService } from './historicalDataService';
import { realtimeDataService } from './realtimeDataService';
import { waterQualityNotificationService } from './WaterQualityNotificationService';

/**
 * Service Container - Manages all service dependencies
 * This implements the Dependency Injection pattern to wire services together
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize all services in the correct order
   */
  async initialize() {
    if (this.initializationPromise) {
      console.log('🔁 Returning existing initialization promise');
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        if (this.initialized) {
          console.log('⚠️ ServiceContainer already initialized');
          return;
        }
        console.log('🔧 Initializing ServiceContainer...');

        try {
          console.log('1️⃣ Initializing core services...');
          await this.initializeCoreServices();
          console.log('✅ Core services initialized');
          
          console.log('2️⃣ Initializing data services...');
          await this.initializeDataServices();
          console.log('✅ Data services initialized');
          
          console.log('3️⃣ Initializing caching services...');
          await this.initializeCachingServices();
          console.log('✅ Caching services initialized');
          
          console.log('4️⃣ Initializing notification services...');
          await this.initializeNotificationServices();
          console.log('✅ Notification services initialized');
          
          console.log('5️⃣ Initializing processing services...');
          await this.initializeProcessingServices();
          console.log('✅ Processing services initialized');
          
          console.log('6️⃣ Initializing facade services...');
          await this.initializeFacadeServices();
          console.log('✅ Facade services initialized');
          
          console.log('7️⃣ Setting up validation and monitoring...');
          await this.setupValidationAndMonitoring();
          console.log('✅ Validation and monitoring set up');
          
          console.log('8️⃣ Initializing legacy adapters...');
          await this.initializeLegacyAdapters();
          console.log('✅ Legacy adapters initialized');
          
          console.log('9️⃣ Running post-initialization...');
          await this.postInitializeServices();
          console.log('✅ Post-initialization complete');
          
          this.initialized = true;
          console.log('✅✅✅ ServiceContainer initialized successfully');
        } catch (error) {
          console.error('❌ Error during initialization step:', error);
          throw error; // Re-throw to be caught by the outer try-catch
        }
      } catch (error) {
        console.error('❌ Critical error during ServiceContainer initialization:', error);
        this.initializationPromise = null; // Allow retry
        this.initialized = false;
        throw error; // Re-throw to allow the app to handle it
      }
    })();

    return this.initializationPromise;
  }

  async initializeCoreServices() {
    console.log('🔧 Initializing core services...');

    // Threshold manager
    const thresholdManager = new WaterQualityThresholdManager();
    this.register('thresholdManager', thresholdManager);

    // Alert engine
    const alertEngine = new AlertEngine(thresholdManager);
    this.register('alertEngine', alertEngine);

    // Water quality calculator
    const waterQualityCalculator = new WaterQualityCalculator();
    this.register('waterQualityCalculator', waterQualityCalculator);

    console.log('✅ Core services initialized');
  }

  async initializeDataServices() {
    console.log('🔧 Initializing data services...');

    // Data repositories
    const sensorDataRepository = new SensorDataRepository();
    this.register('sensorDataRepository', sensorDataRepository);

    const alertRepository = new AlertRepository();
    this.register('alertRepository', alertRepository);

    // Data aggregation service
    const dataAggregationService = new DataAggregationService();
    this.register('dataAggregationService', dataAggregationService);

    console.log('✅ Data services initialized');
  }

  async initializeCachingServices() {
    console.log('🔧 Initializing caching services...');

    // Cache manager
    const cacheManager = new CacheManager();
    this.register('cacheManager', cacheManager);

    // Data cache service
    const dataCacheService = new DataCacheService(cacheManager);
    this.register('dataCacheService', dataCacheService);

    console.log('✅ Caching services initialized');
  }

  async initializeNotificationServices() {
    console.log('🔧 Initializing notification services...');

    try {
      // Dynamically import notification services to break circular dependencies
      const NotificationServiceModule = await import('./notifications/NotificationService');
      const NotificationTemplatesModule = await import('./notifications/NotificationTemplates');
      const WaterQualityNotifierModule = await import('./notifications/WaterQualityNotifier');

      // Handle both default and named exports
      const NotificationService = NotificationServiceModule.default || NotificationServiceModule.NotificationService;
      const NotificationTemplates = NotificationTemplatesModule.default || NotificationTemplatesModule.NotificationTemplates;
      const WaterQualityNotifier = WaterQualityNotifierModule.default || WaterQualityNotifierModule.WaterQualityNotifier;

      // Core notification service
      const notificationService = new NotificationService();

      // Register notification providers
      notificationService.registerProvider('local', {
        send: async (notification) => {
          // Integrate with your existing notification manager
          return await notificationManager.sendLocalNotification(notification);
        }
      });

      // Register default provider for backward compatibility
      notificationService.registerProvider('default', {
        send: async (notification) => {
          // Integrate with your existing notification manager
          return await notificationManager.sendLocalNotification(notification);
        }
      });

      this.register('notificationService', notificationService);

      // Water quality notifier
      const thresholdManager = this.get('thresholdManager');
      const waterQualityNotifier = new WaterQualityNotifier(notificationService, thresholdManager);
      this.register('waterQualityNotifier', waterQualityNotifier);

      console.log('✅ Notification services initialized');
    } catch (error) {
      console.error('❌ Error initializing notification services:', error);
      throw error;
    }
  }

  async initializeProcessingServices() {
    console.log('🔧 Initializing processing services...');

    // Alert processor
    const alertRepository = this.get('alertRepository');
    const dataCacheService = this.get('dataCacheService');
    const thresholdManager = this.get('thresholdManager');
    const alertProcessor = new AlertProcessor(alertRepository, dataCacheService, thresholdManager);
    this.register('alertProcessor', alertProcessor);

    // Data processor
    const dataProcessor = new DataProcessor();
    
    // Add built-in validation rules
    dataProcessor.addValidationRule('pH', DataProcessor.createRangeValidationRule(0, 14));
    dataProcessor.addValidationRule('temperature', DataProcessor.createRangeValidationRule(-10, 60));
    dataProcessor.addValidationRule('turbidity', DataProcessor.createRangeValidationRule(0, 1000));
    dataProcessor.addValidationRule('salinity', DataProcessor.createRangeValidationRule(0, 100));

    // Add transformation rules
    dataProcessor.addTransformationRule('pH', DataProcessor.createRoundingTransformationRule(2));
    dataProcessor.addTransformationRule('temperature', DataProcessor.createRoundingTransformationRule(1));
    dataProcessor.addTransformationRule('turbidity', DataProcessor.createRoundingTransformationRule(1));
    dataProcessor.addTransformationRule('salinity', DataProcessor.createRoundingTransformationRule(1));

    this.register('dataProcessor', dataProcessor);

    // Forecast processor
    const forecastProcessor = new ForecastProcessor();
    this.register('forecastProcessor', forecastProcessor);

    console.log('✅ Processing services initialized');
  }

  async initializeFacadeServices() {
    console.log('🔧 Initializing facade services...');

    // Dashboard data facade
    const dashboardDataFacade = new DashboardDataFacade({
      sensorDataRepository: this.get('sensorDataRepository'),
      alertRepository: this.get('alertRepository'),
      dataAggregationService: this.get('dataAggregationService'),
      waterQualityCalculator: this.get('waterQualityCalculator'),
      dataCacheService: this.get('dataCacheService'),
      alertProcessor: this.get('alertProcessor'),
      dataProcessor: this.get('dataProcessor')
    });
    this.register('dashboardDataFacade', dashboardDataFacade);

    // Alert management facade
    const alertManagementFacade = new AlertManagementFacade({
      alertEngine: this.get('alertEngine'),
      alertProcessor: this.get('alertProcessor'),
      alertRepository: this.get('alertRepository'),
      waterQualityNotifier: this.get('waterQualityNotifier'),
      thresholdManager: this.get('thresholdManager'),
      dataCacheService: this.get('dataCacheService')
    });
    this.register('alertManagementFacade', alertManagementFacade);

    // Reports data facade
    const reportsDataFacade = new ReportsDataFacade({
      sensorDataRepository: this.get('sensorDataRepository'),
      dataAggregationService: this.get('dataAggregationService'),
      waterQualityCalculator: this.get('waterQualityCalculator'),
      dataCacheService: this.get('dataCacheService'),
      dataProcessor: this.get('dataProcessor')
    });
    this.register('reportsDataFacade', reportsDataFacade);

    console.log('✅ Facade services initialized');
  }

  async setupValidationAndMonitoring() {
    console.log('🔧 Setting up validation and monitoring...');

    // Register performance monitor
    this.register('performanceMonitor', performanceMonitor);

    // Schedule cache maintenance
    this.scheduleCacheMaintenance();

    // Setup service health monitoring
    this.setupHealthMonitoring();

    console.log('✅ Validation and monitoring setup complete');
  }

  scheduleCacheMaintenance() {
    const dataCacheService = this.get('dataCacheService');
    
    // Run cache maintenance every 30 minutes
    setInterval(async () => {
      try {
        await dataCacheService.performMaintenance();
        console.log('🧹 Scheduled cache maintenance completed');
      } catch (error) {
        console.error('❌ Error in scheduled cache maintenance:', error);
      }
    }, 30 * 60 * 1000);
  }

  setupHealthMonitoring() {
    // Basic health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy'
    };

    try {
      // Check core services
      const thresholdManager = this.get('thresholdManager');
      health.services.thresholds = thresholdManager ? 'healthy' : 'unavailable';

      // Check cache service
      const dataCacheService = this.get('dataCacheService');
      const cacheStatus = await dataCacheService.getCacheStatus();
      health.services.cache = cacheStatus.memorySize > 0 ? 'healthy' : 'warning';

      // Check notification service
      const notificationService = this.get('notificationService');
      health.services.notifications = notificationService.getProviders().length > 0 ? 'healthy' : 'warning';

      // Determine overall health
      const serviceStates = Object.values(health.services);
      if (serviceStates.includes('unavailable')) {
        health.overall = 'critical';
      } else if (serviceStates.includes('warning')) {
        health.overall = 'warning';
      }

      console.log(`🏥 Health check: ${health.overall}`);

    } catch (error) {
      console.error('❌ Health check failed:', error);
      health.overall = 'critical';
      health.error = error.message;
    }

    return health;
  }

  // Service registration and retrieval
  register(name, service) {
    this.services.set(name, service);
    console.log(`📝 Registered service: ${name}`);
  }

  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service;
  }

  has(name) {
    return this.services.has(name);
  }

  // Convenience methods for facades (main entry points)
  getDashboardFacade() {
    return this.get('dashboardDataFacade');
  }

  getAlertFacade() {
    return this.get('alertManagementFacade');
  }

  getReportsFacade() {
    return this.get('reportsDataFacade');
  }

  async initializeLegacyAdapters() {
    console.log('🔧 Initializing legacy service adapters...');

    this.register('historicalDataService', historicalDataService);
    this.register('realtimeDataService', realtimeDataService);
    this.register('waterQualityNotificationService', waterQualityNotificationService);

    console.log('✅ Legacy service adapters initialized');
  }

  async postInitializeServices() {
    console.log('🔧 Post-initializing legacy service adapters...');

    const historicalDataService = this.get('historicalDataService');
    if (historicalDataService && historicalDataService.postInitialize) {
      historicalDataService.postInitialize(this.get('dataCacheService'));
    }

    const realtimeDataService = this.get('realtimeDataService');
    if (realtimeDataService && realtimeDataService.postInitialize) {
      realtimeDataService.postInitialize(this.get('dashboardDataFacade'), this.get('performanceMonitor'));
    }

    const waterQualityNotificationService = this.get('waterQualityNotificationService');
    if (waterQualityNotificationService && waterQualityNotificationService.postInitialize) {
      waterQualityNotificationService.postInitialize(
        this.get('alertManagementFacade'),
        this.get('waterQualityNotifier'),
        this.get('thresholdManager'),
        this.get('notificationService'),
        scheduledNotificationManager // Pass the singleton instance
      );
    }

    console.log('✅ Legacy service adapters post-initialized');
  }

  // Service status
  getServiceStatus() {
    const status = {};
    for (const [name, service] of this.services.entries()) {
      status[name] = {
        registered: !!service,
        type: service.constructor.name
      };
    }
    return status;
  }

  // Cleanup
  async cleanup() {
    console.log('🧹 Cleaning up services...');
    
    // Clear caches
    try {
      const cacheManager = this.get('cacheManager');
      await cacheManager.cleanAll();
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }

    // Clear services
    this.services.clear();
    this.initialized = false;
    
    console.log('✅ Services cleaned up');
  }
}

// Create singleton instance
const serviceContainer = new ServiceContainer();

// Export a function to initialize services and the container itself
export async function initializeServices() {
  try {
    await serviceContainer.initialize();
    return serviceContainer;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

export default serviceContainer;

// Convenience exports for direct access to facades
export const getDashboardFacade = () => serviceContainer.getDashboardFacade();
export const getAlertFacade = () => serviceContainer.getAlertFacade();
export const getReportsFacade = () => serviceContainer.getReportsFacade();

// src/services/index.js - Main service exports for easy importing
export { default as ServiceContainer } from './ServiceContainer';

// Re-export facades for direct use
export { 
  DashboardDataFacade, 
  AlertManagementFacade, 
  ReportsDataFacade 
} from './facades/DashboardDataFacade';

// Migration helpers - Provides backward compatibility
export class LegacyServiceAdapter {
  constructor(serviceContainer) {
    this.container = serviceContainer;
  }

  /**
   * Adapter for legacy alertManager usage
   */
  get alertManager() {
    return {
      processAlertsFromSensorData: async (sensorData) => {
        const alertFacade = this.container.getAlertFacade();
        const result = await alertFacade.processSensorData(sensorData);
        
        // Transform to legacy format
        return {
          alerts: result.processedAlerts,
          newAlerts: result.newAlerts,
          skipped: false,
          dataSignature: 'legacy-adapter'
        };
      },
      
      getActiveAlerts: async () => {
        const alertFacade = this.container.getAlertFacade();
        return await alertFacade.getAlertsForDisplay({ limit: 20 });
      },
      
      syncAlertsToFirebase: async () => {
        // This is now handled automatically in the new system
        return { synced: 0, errors: 0, message: 'Auto-sync enabled' };
      }
    };
  }

  /**
   * Adapter for legacy waterQualityNotificationService usage
   */
  get waterQualityNotificationService() {
    const notifier = this.container.get('waterQualityNotifier');
    
    return {
      processSensorData: async (sensorData) => {
        // Process alerts first
        const alertFacade = this.container.getAlertFacade();
        const alertResult = await alertFacade.processSensorData(sensorData);
        
        return {
          success: true,
          notificationsSent: alertResult.notifications,
          errors: alertResult.errors
        };
      },
      
      sendWaterQualityAlert: async (parameter, value, alertLevel) => {
        return await notifier.notifyWaterQualityAlert(parameter, value, alertLevel);
      },
      
      updateThresholds: (newThresholds) => {
        const thresholdManager = this.container.get('thresholdManager');
        for (const [param, threshold] of Object.entries(newThresholds)) {
          thresholdManager.updateThreshold(param, threshold);
        }
        return { success: true };
      }
    };
  }
}
