// In src/services/firebase/config.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

// Get Firebase config from app.json
const firebaseConfig = Constants.expoConfig?.extra?.firebase || {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
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

export { app, auth, db };

export default {
  app,
  auth,
  db
};
