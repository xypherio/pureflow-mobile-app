export class NotificationService {
    constructor() {
      this.providers = new Map();
      this.middleware = [];
      this.globalConfig = {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000
      };
    }
  
    // Register notification providers (local, push, email, etc.)
    registerProvider(name, provider) {
      if (!provider.send || typeof provider.send !== 'function') {
        throw new Error(`Provider ${name} must implement send method`);
      }
      
      this.providers.set(name, provider);
      console.log(`📱 Notification provider registered: ${name}`);
    }
  
    // Add middleware for preprocessing notifications
    addMiddleware(middleware) {
      if (typeof middleware !== 'function') {
        throw new Error('Middleware must be a function');
      }
      this.middleware.push(middleware);
    }
  
    // Send notification through specified provider
    async send(notification, providerName = 'default') {
      if (!this.globalConfig.enabled) {
        console.log('📱 Notifications disabled globally');
        return { success: false, reason: 'disabled' };
      }
  
      try {
        // Apply middleware
        let processedNotification = await this.applyMiddleware(notification);
        
        const provider = this.providers.get(providerName);
        if (!provider) {
          throw new Error(`Provider ${providerName} not found`);
        }
  
        // Send with retry logic
        return await this.sendWithRetry(provider, processedNotification);
        
      } catch (error) {
        console.error(`❌ Error sending notification via ${providerName}:`, error);
        return { success: false, error: error.message };
      }
    }
  
    // Send to all registered providers
    async broadcast(notification) {
      const results = [];
      
      for (const [name, provider] of this.providers) {
        try {
          const result = await this.send(notification, name);
          results.push({ provider: name, ...result });
        } catch (error) {
          results.push({ 
            provider: name, 
            success: false, 
            error: error.message 
          });
        }
      }
  
      return results;
    }
  
    async applyMiddleware(notification) {
      let processed = { ...notification };
      
      for (const middleware of this.middleware) {
        processed = await middleware(processed);
      }
      
      return processed;
    }
  
    async sendWithRetry(provider, notification, attempt = 1) {
      try {
        const result = await provider.send(notification);
        
        if (result.success) {
          console.log(`✅ Notification sent successfully (attempt ${attempt})`);
          return result;
        } else {
          throw new Error(result.error || 'Provider send failed');
        }
        
      } catch (error) {
        if (attempt < this.globalConfig.maxRetries) {
          console.log(`🔄 Retrying notification send (attempt ${attempt + 1})`);
          await this.delay(this.globalConfig.retryDelay * attempt);
          return this.sendWithRetry(provider, notification, attempt + 1);
        } else {
          console.error(`❌ Failed to send notification after ${attempt} attempts`);
          return { success: false, error: error.message, attempts: attempt };
        }
      }
    }
  
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    // Configuration methods
    configure(config) {
      this.globalConfig = { ...this.globalConfig, ...config };
    }
  
    enable() {
      this.globalConfig.enabled = true;
    }
  
    disable() {
      this.globalConfig.enabled = false;
    }
  
    getProviders() {
      return Array.from(this.providers.keys());
    }
  }
  
  export default NotificationService;