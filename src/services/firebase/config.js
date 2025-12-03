// In src/services/firebase/config.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';

// Get Firebase config from app.json/app.config.js
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.FIREBASE_MEASUREMENT_ID
};

// Validate required config
const requiredConfig = ['apiKey', 'authDomain', 'projectId'];
const missingConfigs = requiredConfig.filter(key => !firebaseConfig[key]);

if (missingConfigs.length > 0) {
  const errorMessage = `Missing required Firebase config(s): ${missingConfigs.join(', ')}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Initialize Firebase
let app;
let db;
let auth;
let fcm;

// Check if Firebase app is already initialized
try {
  if (!getApps().length) {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Initialize Firestore with persistence
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false
    });
    
    // Initialize Auth
    auth = getAuth(app);

    // Initialize FCM
    fcm = messaging();

    console.log('Firebase services initialized successfully');
  } else {
    // If already initialized, use existing instances
    app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Using existing Firebase app instance');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw new Error(`Failed to initialize Firebase: ${error.message}`);
}

export { app, auth, db, fcm };

export default {
  app,
  auth,
  db,
  fcm
};
