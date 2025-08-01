// firebase.js
import Constants from 'expo-constants';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Main Firebase configuration
export const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
};

// Backend Firebase configuration (if different)
export const backendFirebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.backendFirebaseApiKey || Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.backendFirebaseAuthDomain || Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.backendFirebaseProjectId || Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.backendFirebaseStorageBucket || Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.backendFirebaseMessagingSenderId || Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.backendFirebaseAppId || Constants.expoConfig?.extra?.firebaseAppId,
  measurementId: Constants.expoConfig?.extra?.backendFirebaseMeasurementId || Constants.expoConfig?.extra?.firebaseMeasurementId,
};

// Initialize Firebase apps
const app = initializeApp(firebaseConfig);
const backendApp = initializeApp(backendFirebaseConfig, 'backend');

// Initialize Firestore instances
const db = getFirestore(app);
const backendDb = getFirestore(backendApp);

export { db, backendDb };

