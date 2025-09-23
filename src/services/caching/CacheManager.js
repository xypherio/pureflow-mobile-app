// src/services/caching/CacheManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    this.maxMemoryItems = 100; // Prevent memory bloat
  }

  // Memory cache operations (fastest)
  setMemory(key, value, ttlMs = null) {
    try {
      const cacheItem = {
        value,
        timestamp: Date.now(),
        ttl: ttlMs,
        expiresAt: ttlMs ? Date.now() + ttlMs : null
      };

      // Clean old entries if at capacity
      if (this.memoryCache.size >= this.maxMemoryItems) {
        this.cleanExpiredMemoryEntries();
        
        // If still at capacity, remove oldest entries
        if (this.memoryCache.size >= this.maxMemoryItems) {
          const entries = Array.from(this.memoryCache.entries());
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          // Remove oldest 10%
          const toRemove = Math.floor(this.maxMemoryItems * 0.1);
          for (let i = 0; i < toRemove; i++) {
            this.memoryCache.delete(entries[i][0]);
          }
        }
      }

      this.memoryCache.set(key, cacheItem);
      this.cacheStats.sets++;
      
      console.log(`💾 Memory cache set: ${key} (TTL: ${ttlMs || 'none'}ms)`);
      return true;
    } catch (error) {
      console.error('❌ Error setting memory cache:', error);
      return false;
    }
  }

  getMemory(key) {
    try {
      const cacheItem = this.memoryCache.get(key);
      
      if (!cacheItem) {
        this.cacheStats.misses++;
        return null;
      }

      // Check expiration
      if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
        this.memoryCache.delete(key);
        this.cacheStats.misses++;
        console.log(`⏰ Memory cache expired: ${key}`);
        return null;
      }

      this.cacheStats.hits++;
      console.log(`✅ Memory cache hit: ${key}`);
      return cacheItem.value;
    } catch (error) {
      console.error('❌ Error getting memory cache:', error);
      this.cacheStats.misses++;
      return null;
    }
  }

  deleteMemory(key) {
    try {
      const existed = this.memoryCache.delete(key);
      if (existed) {
        this.cacheStats.deletes++;
        console.log(`🗑️ Memory cache deleted: ${key}`);
      }
      return existed;
    } catch (error) {
      console.error('❌ Error deleting memory cache:', error);
      return false;
    }
  }

  // Persistent cache operations (AsyncStorage)
  async setPersistent(key, value, ttlMs = null) {
    try {
      const cacheItem = {
        value,
        timestamp: Date.now(),
        ttl: ttlMs,
        expiresAt: ttlMs ? Date.now() + ttlMs : null
      };

      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      this.cacheStats.sets++;
      
      console.log(`💾 Persistent cache set: ${key} (TTL: ${ttlMs || 'none'}ms)`);
      return true;
    } catch (error) {
      console.error('❌ Error setting persistent cache:', error);
      return false;
    }
  }

  async getPersistent(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      
      if (!cached) {
        this.cacheStats.misses++;
        return null;
      }

      const cacheItem = JSON.parse(cached);

      // Check expiration
      if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
        await this.deletePersistent(key);
        this.cacheStats.misses++;
        console.log(`⏰ Persistent cache expired: ${key}`);
        return null;
      }

      this.cacheStats.hits++;
      console.log(`✅ Persistent cache hit: ${key}`);
      return cacheItem.value;
    } catch (error) {
      console.error('❌ Error getting persistent cache:', error);
      this.cacheStats.misses++;
      return null;
    }
  }

  async deletePersistent(key) {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
      this.cacheStats.deletes++;
      console.log(`🗑️ Persistent cache deleted: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting persistent cache:', error);
      return false;
    }
  }

  // Hybrid operations (try memory first, fallback to persistent)
  async get(key, useMemory = true, usePersistent = true) {
    // Try memory cache first
    if (useMemory) {
      const memoryResult = this.getMemory(key);
      if (memoryResult !== null) {
        return memoryResult;
      }
    }

    // Fallback to persistent cache
    if (usePersistent) {
      const persistentResult = await this.getPersistent(key);
      if (persistentResult !== null) {
        // Warm memory cache with persistent result
        if (useMemory) {
          this.setMemory(key, persistentResult);
        }
        return persistentResult;
      }
    }

    return null;
  }

  async set(key, value, ttlMs = null, useMemory = true, usePersistent = true) {
    const results = {};

    if (useMemory) {
      results.memory = this.setMemory(key, value, ttlMs);
    }

    if (usePersistent) {
      results.persistent = await this.setPersistent(key, value, ttlMs);
    }

    return results;
  }

  async delete(key, useMemory = true, usePersistent = true) {
    const results = {};

    if (useMemory) {
      results.memory = this.deleteMemory(key);
    }

    if (usePersistent) {
      results.persistent = await this.deletePersistent(key);
    }

    return results;
  }

  // Cache maintenance operations
  cleanExpiredMemoryEntries() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cacheItem] of this.memoryCache.entries()) {
      if (cacheItem.expiresAt && now > cacheItem.expiresAt) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired memory cache entries`);
    }

    return cleanedCount;
  }

  async cleanExpiredPersistentEntries() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      let cleanedCount = 0;

      for (const fullKey of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(fullKey);
          if (cached) {
            const cacheItem = JSON.parse(cached);
            if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
              await AsyncStorage.removeItem(fullKey);
              cleanedCount++;
            }
          }
        } catch (error) {
          // If we can't parse the cache item, remove it
          await AsyncStorage.removeItem(fullKey);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} expired persistent cache entries`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning persistent cache:', error);
      return 0;
    }
  }

  async cleanAll() {
    // Clean memory
    const memoryCount = this.memoryCache.size;
    this.memoryCache.clear();

    // Clean persistent
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log(`🧹 Cleared all cache: ${memoryCount} memory + ${cacheKeys.length} persistent entries`);
      return { memory: memoryCount, persistent: cacheKeys.length };
    } catch (error) {
      console.error('❌ Error clearing persistent cache:', error);
      return { memory: memoryCount, persistent: 0 };
    }
  }

  // Statistics and monitoring
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%'
      : '0%';

    return {
      ...this.cacheStats,
      hitRate,
      memorySize: this.memoryCache.size,
      memoryLimit: this.maxMemoryItems
    };
  }

  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Configuration
  setMaxMemoryItems(limit) {
    this.maxMemoryItems = limit;
    
    // Clean if over limit
    if (this.memoryCache.size > limit) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = this.memoryCache.size - limit;
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  // Utility methods
  has(key, useMemory = true, usePersistent = false) {
    if (useMemory && this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (!item.expiresAt || Date.now() <= item.expiresAt) {
        return true;
      }
    }
    
    // For persistent cache, we'd need to check async
    // This method is primarily for memory cache checking
    return false;
  }

  size(memoryOnly = true) {
    if (memoryOnly) {
      return this.memoryCache.size;
    }
    
    // For total size including persistent, would need async operation
    return this.memoryCache.size;
  }
}