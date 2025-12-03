# Firebase Cloud Messaging (FCM) Setup Guide for PureFlow Mobile App

## Overview

This guide explains how Firebase Cloud Messaging (FCM) has been integrated into the PureFlow mobile app to enable push notifications that work when the app is in the foreground, background, or terminated.

## What's Been Implemented

### 1. Firebase Configuration (`src/services/firebase/config.js`)
- Added Firebase Messaging import and initialization
- Exports FCM instance for app-wide use
- Handles Firebase app initialization with FCM support

### 2. FCM Service (`src/services/firebase/fcmService.js`)
- Complete FCM token management and storage
- Permission requests for push notifications
- Message listeners for different app states:
  - **Foreground**: Converts FCM messages to local notifications
  - **Background**: Handles notification taps
  - **Terminated**: Basic message handling via background handler
- Token refresh handling
- Topic subscription/unsubscription
- Server registration methods

### 3. Enhanced Push Notification Provider (`src/services/notifications/PushNotificationProvider.js`)
- Added support for FCM token storage alongside Expo tokens
- FCM payload preparation method for server-side sending
- Token validation and management
- Maintains backward compatibility with Expo Push

### 4. App Initialization Integration
- FCM service initialization in `AppInitializer.js`
- Background message handler setup in `index.js`
- Error handling that doesn't break app if FCM fails

## How FCM Works in This App

### App States and FCM Behavior

1. **App in Foreground**:
   - FCM message received → Converted to local notification → Displayed immediately
   - No system notification banner (handled locally)

2. **App in Background**:
   - FCM message received → System notification displayed
   - User taps notification → App opens with message data

3. **App Terminated/Killed**:
   - FCM message received → Background handler processes message
   - App may be launched in background, or notification displayed

### Token Management

- FCM tokens are automatically obtained on app initialization
- Tokens are stored locally and in AsyncStorage
- Tokens are managed alongside Expo Push tokens
- Token refresh is handled automatically
- Server registration method available for backend coordination

## Backend Integration

### Server-Side FCM Message Sending

Your backend can send FCM messages using any of these methods:

#### 1. Firebase Admin SDK (Recommended)

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

// Send FCM message
await admin.messaging().send(message);
```

#### 2. FCM REST API

```javascript
const message = {
  to: 'FCM_TOKEN_HERE',
  notification: {
    title: 'Alert!',
    body: 'Water quality threshold exceeded',
    sound: 'default'
  },
  data: {
    type: 'water_quality_alert',
    sensorId: 'sensor-001',
    value: '8.5'
  }
};

fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: {
    'Authorization': 'key=YOUR_SERVER_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(message)
});
```

#### 3. Using the App's Payload Preparation

The app provides `prepareFCMPayload()` method that returns properly formatted FCM payloads:

```javascript
// In the app (for reference)
const pushProvider = new PushNotificationProvider();
const payload = pushProvider.prepareFCMPayload(notification, fcmTokens);

// Example payload structure
{
  "registration_ids": ["fcm_token_1", "fcm_token_2"],
  "notification": {
    "title": "PureFlow Alert",
    "body": "Water quality issue detected",
    "sound": "default",
    "badge": 1
  },
  "data": {
    "type": "fcm_push",
    "sentAt": "2024-01-01T00:00:00.000Z",
    "categoryId": "updates"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channel_id": "alerts",
      "priority": "high",
      "sound": "default",
      "vibrationTimingsMillis": [300, 500, 300, 500]
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "alert": {
          "title": "PureFlow Alert",
          "body": "Water quality issue detected",
          "subtitle": null
        },
        "badge": 1,
        "sound": "default"
      }
    }
  },
  "ttl": 86400,
  "priority": "high"
}
```

### Token Registration with Backend

The app automatically manages FCM tokens, but you can register them with your server:

```javascript
// In your app code
const fcmToken = await fcmService.getCurrentToken();
if (fcmToken) {
  await fetch('https://your-api.com/register-fcm-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fcmToken,
      platform: Platform.OS,
      deviceInfo: {
        appVersion: '2.3.0',
        timestamp: new Date().toISOString()
      }
    })
  });
}
```

Or use the built-in method:
```javascript
await fcmService.registerTokenWithServer();
```

## FCM Message Types

### 1. Display Messages (with notification payload)
```javascript
{
  "notification": {
    "title": "Alert Title",
    "body": "Alert message body"
  },
  "data": {
    "type": "water_quality_alert",
    "value": "8.5"
  }
}
```

### 2. Data Messages (silent/background processing)
```javascript
{
  "data": {
    "type": "background_sync",
    "action": "update_cache",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Hybrid Messages (notification + data)
```javascript
{
  "notification": {
    "title": "Foreground Alert",
    "body": "Check this out!"
  },
  "data": {
    "type": "user_interaction",
    "action": "open_screen",
    "screen": "alerts"
  }
}
```

## Topic Messaging

You can also use FCM topics for broadcast messaging:

```javascript
// Subscribe users to topics
await fcmService.subscribeToTopic('water_quality_alerts');
await fcmService.subscribeToTopic('all_users');

// Send to topic
await admin.messaging().sendToTopic('water_quality_alerts', {
  notification: { title: 'Alert', body: 'Issue detected' }
});
```

## Testing FCM

### 1. Using Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Create a test notification
3. Send to your FCM token or topic

### 2. Using cURL
```bash
curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test FCM message"
    }
  }'
```

### 3. Using the App's FCM Service
The app includes test methods you can call during development.

## Migration from Expo Push

- **Backward Compatible**: Your existing Expo Push setup continues to work
- **Dual Token Support**: The app now manages both Expo tokens and FCM tokens
- **Gradual Migration**: You can migrate server-side sending to FCM while keeping Expo as fallback

## Troubleshooting

### Common Issues

1. **No Token Received**
   - Check Firebase project configuration
   - Ensure `google-services.json` is properly set up
   - Verify device has internet connection

2. **Messages Not Received**
   - Check FCM server key configuration
   - Verify token validity
   - Test with Firebase Console first

3. **Permissions Denied**
   - Check notification permissions in device settings
   - Ensure FCM permissions are requested properly

### Debug Logging

The app includes comprehensive logging with emojis:
- 🔥 FCM initialization
- ✅ Success messages
- ❌ Error messages
- 📱 Token operations
- 📥 Message reception
- 👆 Notification taps
- 🏠 Background messages

## Security Notes

- **Server Key**: Never store FCM server keys in client apps
- **Token Storage**: FCM tokens are sensitive; store securely
- **Validation**: Always validate message payloads server-side
- **Rate Limits**: FCM has rate limits; implement proper error handling

## Next Steps

1. Set up your backend with FCM server key
2. Test message sending with Firebase Console
3. Implement proper backend API for token registration
4. Customize notification channels and sounds
5. Add analytics tracking for notification delivery
6. Consider implementing rich notifications with images

---

This FCM setup provides a robust foundation for push notifications that work across all app states while maintaining compatibility with your existing Expo Push implementation.
