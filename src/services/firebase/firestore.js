import { collection, getDocs, query as firestoreQuery, where, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "./config";

export const fetchAllDocuments = async (collectionName, options = {}) => {
  const { 
    filters = [], 
    orderByField, 
    orderDirection = 'asc', 
    limit: limitCount,
    startAfter,
    endBefore
  } = options;
  
  let q = firestoreQuery(collection(db, collectionName));

  // Add where conditions for date range if provided
  if (startAfter) {
    q = firestoreQuery(q, where('datetime', '>=', startAfter));
  }
  if (endBefore) {
    q = firestoreQuery(q, where('datetime', '<=', endBefore));
  }

  // Add additional filters
  if (filters.length > 0) {
    filters.forEach(filter => {
      q = firestoreQuery(q, where(filter.field, filter.operator, filter.value));
    });
  }

  // Add sorting
  if (orderByField) {
    q = firestoreQuery(q, orderBy(orderByField, orderDirection));
  }

  // Add limit
  if (limitCount) {
    q = firestoreQuery(q, limit(limitCount));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
