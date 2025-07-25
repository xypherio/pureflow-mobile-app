import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

/**
 * Fetches all documents from a Firestore collection.
 * @param {string} datm_data - The name of the Firestore collection.
 * @returns {Promise<Array<Object>>} - Array of document data objects.
 */
export async function fetchAllDocuments(datm_data) {
  const colRef = collection(db, datm_data);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
