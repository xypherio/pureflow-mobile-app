const admin = require('firebase-admin');

let firebaseApp;

function initializeFirebase() {
  if (firebaseApp && admin.apps.length > 0) return firebaseApp;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      console.log('🔑 Initializing Firebase with Base64 service account');

      const serviceAccountJson = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64'
      ).toString('utf8');

      const serviceAccount = JSON.parse(serviceAccountJson);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('🔑 Initializing Firebase with environment variables');

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: privateKey,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
    else {
      console.log('🔑 Initializing Firebase with default credentials');
      firebaseApp = admin.initializeApp();
    }

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Firebase init failed:', error.message);
    throw new Error(`Firebase error: ${error.message}`);
  }
}

function getMessaging() {
  if (!firebaseApp) throw new Error('Firebase not initialized');
  return admin.messaging(firebaseApp);
}

async function checkFirebaseHealth() {
  try {
    getMessaging();
    const projectId = firebaseApp.options.projectId;
    return { status: 'healthy', projectId, timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

module.exports = { initializeFirebase, getMessaging, checkFirebaseHealth, getFirebaseApp: () => firebaseApp };
