// firebase.js
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Firebase
const initializeFirebase = () => {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    
    // Initialize Firestore and Storage
    const db = getFirestore(app);
    const storage = getStorage(app);
    
    console.log('Firebase services initialized successfully');
    
    return {
      app,
      db,
      storage
    };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error; // Re-throw to handle in the calling code
  }
};

// Initialize Firebase and export the instances
const firebase = initializeFirebase();
export const app = firebase.app;
export const auth = firebase.auth;
export const db = firebase.db;
export const storage = firebase.storage;

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

// Initialize backend Firebase app
let backendApp;
let backendDb;

try {
  backendApp = initializeApp(backendFirebaseConfig, 'datm_data');
  backendDb = getFirestore(backendApp);
  console.log('Backend Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Backend Firebase:', error);
}

export { backendApp, backendDb };

