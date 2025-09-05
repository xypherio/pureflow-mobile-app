import { 
  addDoc, 
  collection, 
  query as firestoreQuery, 
  getDocs, 
  limit, 
  orderBy, 
  where, 
  enableIndexedDbPersistence,
  Timestamp
} from "firebase/firestore";
import { db } from './config';

// Initialize offline persistence when in a browser environment
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => console.log("Firestore offline persistence enabled"))
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Offline persistence already enabled in another tab");
      } else if (err.code === 'unimplemented') {
        console.warn("Browser doesn't support offline persistence");
      } else {
        console.error("Error enabling offline persistence:", err);
      }
    });
}

/**
 * Validates query options and throws meaningful errors if invalid
 */
const validateQueryOptions = (collectionName, options = {}) => {
  if (!collectionName || typeof collectionName !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }

  const { filters = [], orderByField, orderDirection = 'asc' } = options;
  
  if (!['asc', 'desc'].includes(orderDirection)) {
    throw new Error('orderDirection must be either "asc" or "desc"');
  }

  // Validate filters
  if (!Array.isArray(filters)) {
    throw new Error('filters must be an array');
  }

  filters.forEach((filter, index) => {
    if (!filter || typeof filter !== 'object') {
      throw new Error(`Filter at index ${index} must be an object`);
    }
    if (!filter.field || typeof filter.field !== 'string') {
      throw new Error(`Filter at index ${index} must have a field property`);
    }
    if (!['<', '<=', '==', '!=', '>=', '>', 'array-contains', 'in', 'not-in', 'array-contains-any'].includes(filter.operator)) {
      throw new Error(`Invalid operator "${filter.operator}" in filter at index ${index}`);
    }
  });
};

/**
 * Tracks operation performance and logs results
 */
const trackOperation = async (operationName, operation) => {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    console.log(`[PERF] ${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[PERF] ${operationName} failed after ${duration}ms`, error);
    throw error;
  }
};

export const fetchAllDocuments = async (collectionName, options = {}) => {
  return trackOperation(`fetchAllDocuments(${collectionName})`, async () => {
    try {
      validateQueryOptions(collectionName, options);
      
      const { 
        filters = [], 
        orderByField, 
        orderDirection = 'asc', 
        limit: limitCount,
        startAfter,
        endBefore
      } = options;
      
      console.log(`Fetching documents from ${collectionName}`, { 
        filters: filters.map(f => `${f.field} ${f.operator} ${f.value}`),
        orderBy: orderByField ? `${orderByField} ${orderDirection}` : 'none',
        limit: limitCount || 'none',
        dateRange: startAfter || endBefore 
          ? `${startAfter?.toISOString?.() || '...'} to ${endBefore?.toISOString?.() || '...'}` 
          : 'none'
      });

      let q = firestoreQuery(collection(db, collectionName));

      // Add where conditions for date range if provided
      if (startAfter) {
        const startDate = startAfter instanceof Date ? startAfter : new Date(startAfter);
        q = firestoreQuery(q, where('datetime', '>=', startDate));
      }
      if (endBefore) {
        const endDate = endBefore instanceof Date ? endBefore : new Date(endBefore);
        q = firestoreQuery(q, where('datetime', '<=', endDate));
      }

      // Add additional filters
      filters.forEach(filter => {
        q = firestoreQuery(q, where(filter.field, filter.operator, filter.value));
      });

      // Add sorting
      if (orderByField) {
        q = firestoreQuery(q, orderBy(orderByField, orderDirection));
      }

      // Add limit
      if (limitCount) {
        q = firestoreQuery(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to JavaScript Dates
        Object.keys(data).forEach(key => {
          if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
          }
        });
        return { id: doc.id, ...data };
      });

      console.log(`Fetched ${documents.length} documents from ${collectionName}`);
      return documents;
      
    } catch (error) {
      console.error(`Error fetching documents from ${collectionName}:`, {
        error: error.message,
        code: error.code,
        stack: error.stack,
        options
      });
      throw error; // Re-throw to allow caller to handle
    }
  });
};

// Helper function to remove undefined fields from an object
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject).filter(item => item !== undefined);
  }
  
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === undefined) return acc;
    
    const sanitizedValue = typeof value === 'object' ? sanitizeObject(value) : value;
    if (sanitizedValue !== undefined) {
      acc[key] = sanitizedValue;
    }
    
    return acc;
  }, {});
};

export const addAlertToFirestore = async (alerts) => {
  try {
    if (Array.isArray(alerts)) {
      // Sanitize each alert in the array
      const sanitizedAlerts = alerts.map(alert => sanitizeObject(alert));
      const promises = sanitizedAlerts.map(alert => addDoc(collection(db, "alerts"), alert));
      const docRefs = await Promise.all(promises);
      console.log(`${docRefs.length} alerts added successfully.`);
      return docRefs.map(ref => ref.id);
    } else {
      // Sanitize single alert
      const sanitizedAlert = sanitizeObject(alerts);
      const docRef = await addDoc(collection(db, "alerts"), sanitizedAlert);
      console.log("Alert added with ID: ", docRef.id);
      return docRef.id;
    }
  } catch (e) {
    console.error("Error adding alert(s): ", e);
    throw e;
  }
};