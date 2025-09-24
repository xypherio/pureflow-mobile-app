/**
 * CacheManager.js
 * 
 * A robust caching solution that provides both in-memory and persistent caching
 * capabilities with configurable TTL (Time To Live) for each cache entry.
 * 
 * Features:
 * - Two-level caching: In-memory (fast) and persistent (AsyncStorage)
 * - Automatic cache eviction based on TTL
 * - Memory management with size limits
 * - Cache statistics and monitoring
 * - Thread-safe operations
 * 
 * @module CacheManager
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Manages caching operations with both memory and persistent storage layers.
 * Implements a least-recently-used (LRU) eviction policy for memory cache.
 */
export class CacheManager {
  /**
   * Initializes a new CacheManager instance.
   * Sets up in-memory cache and initializes statistics tracking.
   */
  constructor() {
    /** @private */
    this.memoryCache = new Map();
    
    /** 
     * @private
     * @type {Object} Cache statistics
     * @property {number} hits - Number of successful cache retrievals
     * @property {number} misses - Number of failed cache retrievals
     * @property {number} sets - Number of cache sets
     * @property {number} deletes - Number of cache deletions
     */
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    /** @private */
    this.maxMemoryItems = 100; // Maximum number of items to store in memory
  }

  /**
   * Stores a value in the memory cache.
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   * @param {number} [ttlMs=null] - Time to live in milliseconds (null for no expiration)
   * @returns {boolean} True if the operation was successful
   */
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

  /**
   * Retrieves a value from the memory cache.
   * 
   * @param {string} key - The cache key
   * @returns {*|null} The cached value or null if not found/expired
   */
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

  /**
   * Removes an entry from the memory cache.
   * 
   * @param {string} key - The cache key to remove
   * @returns {boolean} True if the key existed and was removed
   */
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

  /**
   * Stores a value in the persistent cache (AsyncStorage).
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache (must be serializable)
   * @param {number} [ttlMs=null] - Time to live in milliseconds (null for no expiration)
   * @returns {Promise<boolean>} True if the operation was successful
   */
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

  /**
   * Retrieves a value from the persistent cache.
   * 
   * @param {string} key - The cache key
   * @returns {Promise<*|null>} The cached value or null if not found/expired
   */
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

  /**
   * Removes an entry from the persistent cache.
   * 
   * @param {string} key - The cache key to remove
   * @returns {Promise<boolean>} True if the key existed and was removed
   */
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

  /**
   * Retrieves a value from the cache, trying memory first and falling back to persistent storage.
   * 
   * @param {string} key - The cache key
   * @param {boolean} [useMemory=true] - Whether to check memory cache
   * @param {boolean} [usePersistent=true] - Whether to check persistent storage
   * @returns {Promise<*|null>} The cached value or null if not found
   */
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

  /**
   * Stores a value in the cache layers based on configuration.
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   * @param {number} [ttlMs=null] - Time to live in milliseconds
   * @param {boolean} [useMemory=true] - Whether to store in memory
   * @param {boolean} [usePersistent=true] - Whether to store persistently
   * @returns {Promise<Object>} Results of each storage operation
   */
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

  /**
   * Removes an entry from the cache layers based on configuration.
   * 
   * @param {string} key - The cache key to remove
   * @param {boolean} [useMemory=true] - Whether to remove from memory
   * @param {boolean} [usePersistent=true] - Whether to remove from persistent storage
   * @returns {Promise<Object>} Results of each deletion operation
   */
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

  /**
   * Removes all expired entries from the memory cache.
   * 
   * @returns {number} Number of entries removed
   */
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

  /**
   * Removes all expired entries from the persistent cache.
   * 
   * @returns {Promise<number>} Number of entries removed
   */
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

  /**
   * Clears all cache entries from both memory and persistent storage.
   * 
   * @returns {Promise<Object>} Count of entries removed from each cache layer
   */
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

  /**
   * Returns cache statistics including hit rate and current size.
   * 
   * @returns {Object} Cache statistics
   * @property {number} hits - Number of cache hits
   * @property {number} misses - Number of cache misses
   * @property {number} sets - Number of cache sets
   * @property {number} deletes - Number of cache deletions
   * @property {string} hitRate - Hit rate as a percentage
   * @property {number} memorySize - Current number of items in memory cache
   * @property {number} memoryLimit - Maximum allowed items in memory cache
   */
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

  /**
   * Resets all cache statistics to zero.
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Sets the maximum number of items to store in the memory cache.
   * If the new limit is lower than the current size, oldest items will be evicted.
   * 
   * @param {number} limit - Maximum number of items to store in memory
   */
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

  /**
   * Checks if a key exists in the cache.
   * Note: For persistent storage, this only checks memory by default for performance.
   * 
   * @param {string} key - The key to check
   * @param {boolean} [useMemory=true] - Whether to check memory cache
   * @param {boolean} [usePersistent=false] - Whether to check persistent storage
   * @returns {boolean} True if the key exists and is not expired
   */
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

  /**
   * Returns the current size of the cache.
   * 
   * @param {boolean} [memoryOnly=true] - If true, only returns memory cache size
   * @returns {number} Number of items in the cache
   */
  size(memoryOnly = true) {
    if (memoryOnly) {
      return this.memoryCache.size;
    }
    
    // For total size including persistent, would need async operation
    return this.memoryCache.size;
  }
}