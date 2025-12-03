# 🚀 FCM Full Deployment Checklist

## ✅ COMPLETED COMPONENTS

### 1. Frontend Mobile App Setup
- ✅ React Native Firebase Messaging installed (`@react-native-firebase/messaging@23.5.0`)
- ✅ Firebase configuration with FCM (`src/services/firebase/config.js`)
- ✅ Complete FCM service implementation (`src/services/firebase/fcmService.js`)
- ✅ Push Notification Provider updated with FCM support
- ✅ App initialization includes FCM setup (`src/AppInitializer.js`)
- ✅ Background message handler configured (`index.js`)
- ✅ Settings modal includes FCM testing (battery settings removed)
- ✅ Android build configuration includes Google Services plugin

### 2. Backend Development Tools
- ✅ Firebase Admin SDK installed (`firebase-admin`)
- ✅ Comprehensive backend test script (`test-fcm-backend.js`)
- ✅ Service account key ready for backend

## 🔧 REQUIRED ACTIONS FOR FULL DEPLOYMENT

### 📱 Mobile App Deployment

#### **Critical: Rebuild Android App**
FCM requires native modules to be properly linked during build:

```bash
# Rebuild with clean cache (REQUIRED for FCM to work)
npx expo run:android --clear

# Alternative if issues persist:
npx expo run:android --no-build-cache
```
**Expected build output:**
```
✅ Firebase app initialized successfully
✅ Firebase services initialized successfully
✅ FCM service initialized successfully
📱 FCM Token: [LONG_TOKEN_STRING]
```

#### **Test FCM After Build**
1. Launch rebuilt app
2. Go to Settings → "Test FCM Notifications"
3. Copy the FCM token displayed
4. Run backend test: `node test-fcm-backend.js YOUR_TOKEN`
5. Verify device receives 4 test notifications

### 🔥 Firebase Console Setup

#### **Enable Cloud Messaging**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your `pureflow-system` project
3. Navigate to **Cloud Messaging** tab
4. Click **"Get started with Cloud Messaging"** (if not already enabled)
5. Verify **Sender ID**: `817474825207`

#### **Generate Server Key for Backend**
1. In Cloud Messaging → **Server key** section
2. Copy the server key (starts with `AAAA...`)
3. Store securely for backend use

### 💻 Backend Deployment Options

#### **Option A: Firebase Admin SDK (Recommended)**

**1. Install SDK:**
```bash
npm install firebase-admin
```

**2. Configure Service Account:**
```javascript
// Place your downloaded service account JSON in project root
const admin = require('firebase-admin');
const serviceAccount = require('./pureflow-system-firebase-adminsdk-XXXXX.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

**3. Send Test Notification:**
```javascript
const message = {
  token: 'FCM_TOKEN_FROM_APP',
  notification: {
    title: 'Water Quality Alert!',
    body: 'pH levels are critical'
  },
  data: {
    type: 'water_quality_alert',
    sensorId: 'sensor-001',
    value: '8.5'
  }
};

admin.messaging().send(message);
```

#### **Option B: FCM REST API (Simpler)**

**1. Store Server Key:**
```javascript
const FCM_SERVER_KEY = 'YOUR_SERVER_KEY_FROM_CONSOLE';
```

**2. Send via REST:**
```javascript
const response = await fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: {
    'Authorization': `key=${FCM_SERVER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'FCM_TOKEN_FROM_APP',
    notification: {
      title: 'Test',
      body: 'Message',
      sound: 'default'
    }
  })
});
```

### 🔗 Integration Points

#### **Mobile App → Backend Communication**
```javascript
// In app: Send FCM token to backend
const fcmToken = await fcmService.getCurrentToken();
await fetch('https://your-backend.com/register-token', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    fcmToken: fcmToken,
    platform: Platform.OS
  })
});
```

#### **Backend → FCM Message Flow**
```javascript
// Backend: Send alert via FCM
async function sendWaterAlert(userId, sensorData) {
  // Get FCM token from database
  const user = await User.findById(userId);

  if (!user.fcmToken) return;

  await admin.messaging().send({
    token: user.fcmToken,
    notification: {
      title: `${sensorData.parameter.toUpperCase()} Alert!`,
      body: `${sensorData.parameter} level: ${sensorData.value}`
    },
    data: sensorData
  });
}
```

### 🧪 Testing Checklist

#### **Step 1: Mobile App Testing**
- [ ] App rebuilds successfully (`npx expo run:android --clear`)
- [ ] FCM service logs show initialization messages
- [ ] Settings → Test FCM displays token
- [ ] Local notifications work when using test button

#### **Step 2: Backend-FCM Testing**
- [ ] Firebase Admin SDK initializes
- [ ] Service account key loads without errors
- [ ] `test-fcm-backend.js` sends notifications successfully
- [ ] Mobile device receives test notifications

#### **Step 3: End-to-End Testing**
- [ ] Register FCM token with backend API
- [ ] Backend sends water quality alerts
- [ ] App receives and displays notifications in all states:
  - [ ] Foreground (local notification)
  - [ ] Background (system notification)
  - [ ] Terminated (background handler)

### 📋 Database Schema for FCM

#### **User Table Extension:**
```sql
-- Add FCM token storage
ALTER TABLE users ADD COLUMN fcm_token TEXT;
ALTER TABLE users ADD COLUMN platform VARCHAR(10); -- 'ios' or 'android'
ALTER TABLE users ADD COLUMN token_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

#### **Alert Preferences:**
```sql
CREATE TABLE user_alert_settings (
  user_id INTEGER REFERENCES users(id),
  alert_type VARCHAR(50), -- 'ph', 'temperature', 'turbidity', 'salinity'
  enabled BOOLEAN DEFAULT true,
  threshold_min DECIMAL,
  threshold_max DECIMAL
);
```

### 🚨 Error Handling & Monitoring

#### **Common FCM Deployment Issues:**

1. **"RNFBAppModule not found"**
   - **Solution**: Rebuid with `--clear` flag
   - **Prevention**: Always use clean builds for FCM changes

2. **"Invalid registration token"**
   - **Cause**: FCM token expired or invalid
   - **Solution**: Get fresh token, handle token refresh events

3. **Messages not received**
   - **Check**: App permissions, background restrictions
   - **Solution**: Ensure POST_NOTIFICATIONS permission granted

4. **Background messages not processed**
   - **Check**: Background message handler registration
   - **Solution**: Handler must be registered at app root level

#### **Production Monitoring:**
```javascript
// Log FCM message delivery
admin.messaging().send(message)
  .then(response => {
    console.log('FCM sent:', response);
    // Log to monitoring service
  })
  .catch(error => {
    console.error('FCM failed:', error);
    // Alert monitoring system
  });
```

### 🔐 Security Best Practices

#### **Service Account Management:**
- ✅ Store service account JSON securely (never in client apps)
- ✅ Use environment variables for all sensitive keys
- ✅ Rotate service account keys regularly
- ✅ Limit service account permissions to FCM only

#### **Token Security:**
- ✅ Store FCM tokens encrypted in database
- ✅ Implement token refresh handling
- ✅ Validate token validity before sending
- ✅ Clean up tokens when users logout/uninstall

### 🚀 Deployment Complete!

Once all steps above are completed:

1. **Mobile app rebuilds successfully** with FCM support
2. **Backend sends FCM notifications** to registered devices
3. **All app states work**: FG/BG/Terminated notifications
4. **Testing passes**: End-to-end notification delivery

Your **PureFlow FCM system is fully deployed**! 🎉

---

**Next Steps:** Start sending water quality alerts to users in real-time! 💧📱
