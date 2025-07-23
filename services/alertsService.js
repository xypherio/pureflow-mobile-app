import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore';
import { firebaseApp } from '../firebase/config';

const db = getFirestore(firebaseApp);
const ALERTS_COLLECTION = 'alerts';

// Add a new alert to Firestore
export async function addAlert(alert) {
  // alert should be an object with { parameter, type, title, message }
  return await addDoc(collection(db, ALERTS_COLLECTION), alert);
}

// Get all alerts from Firestore
export async function getAllAlerts() {
  const snapshot = await getDocs(collection(db, ALERTS_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Delete an alert by ID
export async function deleteAlert(alertId) {
  return await deleteDoc(doc(db, ALERTS_COLLECTION, alertId));
} 