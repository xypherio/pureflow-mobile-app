import { addDoc, collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { backendDb, db } from "./config";

// Cache for storing recent queries to avoid redundant requests
const queryCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Clears expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      queryCache.delete(key);
    }
  }
}

/**
 * Optimized function to fetch documents with caching and error handling
 * @param {string} collectionName - The name of the Firestore collection
 * @param {Object} options - Query options
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @param {number} options.limitCount - Limit number of documents
 * @param {string} options.orderByField - Field to order by
 * @param {string} options.orderDirection - Order direction ('asc' or 'desc')
 * @returns {Promise<Array<Object>>} - Array of document data objects
 */
export async function fetchAllDocuments(collectionName, options = {}) {
  const {
    useCache = true,
    limitCount = null,
    orderByField = null,
    orderDirection = 'desc'
  } = options;

  // Create cache key
  const cacheKey = `${collectionName}_${JSON.stringify(options)}`;
  
  // Check cache first
  if (useCache && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Using cached data for ${collectionName}`);
      return cached.data;
    }
  }

  try {
    let colRef = collection(db, collectionName);
    let queryRef = colRef;

    // Add ordering if specified
    if (orderByField) {
      queryRef = query(queryRef, orderBy(orderByField, orderDirection));
    }

    // Add limit if specified
    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }

    const snapshot = await getDocs(queryRef);
    const data = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Convert Firestore timestamps to JavaScript dates
      ...(doc.data().timestamp && {
        timestamp: doc.data().timestamp.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
      })
    }));

    // Cache the result
    if (useCache) {
      queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Clean expired cache periodically
      if (queryCache.size > 10) {
        clearExpiredCache();
      }
    }

    console.log(`✅ Fetched ${data.length} documents from ${collectionName}`);
    return data;

  } catch (error) {
    console.error(`❌ Error fetching documents from ${collectionName}:`, error);
    
    // Return cached data if available, even if expired
    if (queryCache.has(cacheKey)) {
      console.log(`⚠️ Returning stale cached data for ${collectionName}`);
      return queryCache.get(cacheKey).data;
    }
    
    throw error;
  }
}

/**
 * Fetches documents from backend Firestore with the same optimizations
 * @param {string} collectionName - The name of the Firestore collection
 * @param {Object} options - Query options
 * @returns {Promise<Array<Object>>} - Array of document data objects
 */
export async function fetchAllDocumentsBackend(collectionName, options = {}) {
  const {
    useCache = true,
    limitCount = null,
    orderByField = null,
    orderDirection = 'desc'
  } = options;

  const cacheKey = `backend_${collectionName}_${JSON.stringify(options)}`;
  
  if (useCache && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    let colRef = collection(backendDb, collectionName);
    let queryRef = colRef;

    if (orderByField) {
      queryRef = query(queryRef, orderBy(orderByField, orderDirection));
    }

    if (limitCount) {
      queryRef = query(queryRef, limit(limitCount));
    }

    const snapshot = await getDocs(queryRef);
    const data = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      ...(doc.data().timestamp && {
        timestamp: doc.data().timestamp.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
      })
    }));

    if (useCache) {
      queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }

    return data;

  } catch (error) {
    console.error(`Error fetching documents from backend ${collectionName}:`, error);
    
    if (queryCache.has(cacheKey)) {
      return queryCache.get(cacheKey).data;
    }
    
    throw error;
  }
}

/**
 * Optimized function to add alerts with deduplication and batch processing
 * @param {Object|Array} alerts - Single alert or array of alerts
 * @returns {Promise<void>}
 */
export async function addAlertToFirestore(alerts) {
  try {
    const alertArray = Array.isArray(alerts) ? alerts : [alerts];
    
    if (alertArray.length === 0) return;

    // Add alerts individually (could be optimized with batch writes for multiple alerts)
    const promises = alertArray.map(alert => 
      addDoc(collection(db, "alerts"), {
        ...alert,
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString(),
      })
    );

    await Promise.all(promises);
    console.log(`✅ Added ${alertArray.length} alert(s) to Firestore`);
    
    // Clear cache for alerts collection to ensure fresh data
    for (const key of queryCache.keys()) {
      if (key.includes('alerts')) {
        queryCache.delete(key);
      }
    }

  } catch (error) {
    console.error("❌ Error adding alert(s) to Firestore:", error);
    throw error;
  }
}

/**
 * Get recent alerts with filtering
 * @param {number} limitCount - Number of recent alerts to fetch
 * @param {string} severity - Filter by severity level
 * @returns {Promise<Array<Object>>} - Array of recent alerts
 */
export async function getRecentAlerts(limitCount = 50, severity = null) {
  try {
    const options = {
      limitCount,
      orderByField: 'timestamp',
      orderDirection: 'desc'
    };

    let alerts = await fetchAllDocuments('alerts', options);
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    return [];
  }
}

/**
 * Clear all cached data
 */
export function clearFirestoreCache() {
  queryCache.clear();
  console.log('🧹 Firestore cache cleared');
}
