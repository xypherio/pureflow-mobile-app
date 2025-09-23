// src/services/index.js
export { default as ServiceContainer } from './ServiceContainer';

// Main facades for app usage
export {
    getAlertFacade, getDashboardFacade, getReportsFacade
} from './ServiceContainer';

// Legacy compatibility
export { LegacyServiceAdapter } from './ServiceContainer';

// Keep your existing exports for gradual migration
export { default as alertManager } from './alertManager'; // Keep temporarily
export { default as dataPreloader } from './dataPreloader'; // Keep temporarily
export { default as waterQualityNotificationService } from './WaterQualityNotificationService'; // Keep temporarily
// ... other existing exports