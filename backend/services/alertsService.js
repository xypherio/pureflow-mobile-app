import { firebaseApp } from '@backend/firebase/config';
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore';

const db = getFirestore(firebaseApp);
const ALERTS_COLLECTION = 'alerts';

// Add a new alert to Firestore
export async function addAlert(alert) {
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