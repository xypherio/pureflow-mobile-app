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

export const addAlertToFirestore = async (alerts) => {
  try {
    if (Array.isArray(alerts)) {
      const promises = alerts.map(alert => addDoc(collection(db, "alerts"), alert));
      const docRefs = await Promise.all(promises);
      console.log(`${docRefs.length} alerts added successfully.`);
      return docRefs.map(ref => ref.id);
    } else {
      const docRef = await addDoc(collection(db, "alerts"), alerts);
      console.log("Alert added with ID: ", docRef.id);
      return docRef.id;
    }
  } catch (e) {
    console.error("Error adding alert(s): ", e);
    throw e;
  }
};
