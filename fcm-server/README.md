# PureFlow FCM Server

Firebase Cloud Messaging (FCM) server for the PureFlow water monitoring mobile app. This serverless application handles sending push notifications to users when water quality alerts, maintenance reminders, and other important events occur.

## 🚀 Features

- **Serverless**: Deployed on Vercel for optimal performance
- **Secure**: API key authentication and rate limiting
- **Production-ready**: Comprehensive error handling and monitoring
- **Multi-platform**: iOS and Android notification support
- **Type-safe**: Input validation and sanitization

## 📡 API Endpoints

### Health & Info
- `GET /` - Health check
- `GET /api/info` - Service information

### Notification Endpoints
- `POST /api/send` - Send generic notification
- `POST /api/alert` - Send water quality alert
- `POST /api/maintenance` - Send maintenance reminder
- `POST /api/forecast` - Send forecast alert
- `POST /api/custom` - Send custom notification

## 🛠️ Setup & Deployment

### Prerequisites

- Node.js 18+
- Firebase project with FCM enabled
- Vercel account (free tier available)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Navigate to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file - **keep this secure!**

### 2. Encode Service Account

Convert your Firebase service account JSON to Base64:

```bash
# On Windows PowerShell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content 'path/to/serviceAccount.json' -Raw)))

# On Windows Command Prompt
certutil -encode serviceAccount.json temp.b64 && findstr /v /c:- temp.b64 > encoded.txt

# On Linux/macOS
base64 -w 0 serviceAccount.json
```

### 3. Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Clone/Navigate to this project:**
   ```bash
   cd fcm-server
   ```

3. **Deploy to Vercel:**
   ```bash
   npm install
   vercel
   ```

4. **Set Environment Variables** in Vercel dashboard or CLI:
   ```bash
   vercel secrets add firebase_service_account_b64
   vercel secrets add api_secret_key
   vercel secrets add allowed_origins
   ```

   Or through the Vercel web dashboard under your project settings.

### 4. Environment Variables

Set these in your Vercel project:

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64-encoded Firebase service account JSON | `eyJ0e...` |
| `API_SECRET_KEY` | Secret key for API authentication | `super-secret-key-12345` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://pureflow.vercel.app` |
| `NODE_ENV` | Environment (production/development) | `production` |

## 🔧 API Usage

All requests require an `x-api-key` header with your `API_SECRET_KEY`.

### Example: Send Water Quality Alert

```javascript
const response = await fetch('https://your-vercel-app.vercel.app/api/alert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-secret-key'
  },
  body: JSON.stringify({
    fcmToken: 'user-fcm-token-here',
    sensorData: {
      sensorId: 'ph-sensor-001',
      parameter: 'ph',
      value: 8.5,
      threshold: 7.5,
      location: 'Main Pond'
    }
  })
});
```

### Example: Send Custom Notification

```javascript
const response = await fetch('https://your-vercel-app.vercel.app/api/custom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-secret-key'
  },
  body: JSON.stringify({
    fcmToken: 'user-fcm-token-here',
    customData: {
      title: 'System Update',
      body: 'PureFlow has been updated with new features!',
      type: 'system_update',
      action: 'check_app'
    }
  })
});
```

## 🧪 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run locally:**
   ```bash
   npm run dev
   # Server will start on http://localhost:3001
   ```

4. **Test endpoints:**
   ```bash
   curl -X GET http://localhost:3001/
   ```

## 🔒 Security Features

- **API Key Authentication**: All endpoints require valid API key
- **Rate Limiting**: 30 requests/minute per IP for notifications, 5/hour for broadcasts
- **Input Validation**: Comprehensive parameter validation
- **CORS Protection**: Configurable allowed origins
- **Error Sanitization**: Safe error messages in production

## 📊 Monitoring

The server includes built-in monitoring:

- **Health Checks**: `/` endpoint provides system status
- **Request Logging**: All requests are logged with timestamps
- **Error Tracking**: Failed notifications are logged for debugging
- **Rate Limiting**: abuse prevention

## 🚨 Error Handling

- **Graceful Degradation**: Server continues operating despite Firebase issues
- **Retry Logic**: Automatic retries for transient failures
- **Clear Error Messages**: Descriptive error responses
- **Fallback Mechanisms**: Alternative notification methods when primary fails

## 📝 Notification Types

### Water Quality Alerts
Sent when water parameters exceed thresholds:
- pH, temperature, turbidity, salinity, dissolved oxygen, conductivity
- Critical vs warning severity levels
- Location and unit information

### Maintenance Reminders
Scheduled maintenance notifications:
- Calibration reminders
- Equipment checks
- Due date tracking

### Forecast Alerts
Predictive notifications:
- Water quality forecasts
- Weather alerts
- Trend predictions

### Custom Notifications
Flexible notification system for any use case.

## 🔧 Troubleshooting

### Common Issues

1. **403 Unauthorized**: Check your API key
2. **429 Too Many Requests**: Rate limited, wait and retry
3. **500 Internal Server Error**: Check server logs
4. **Firebase errors**: Verify service account credentials

### Debugging

1. Check Vercel logs: `vercel logs`
2. Health check: `GET /`
3. Test with local development server first

## 📈 Scaling

This serverless setup automatically scales with usage:

- **Free tier**: 100GB bandwidth, 100 hours/month
- **Hobby plan**: $7/month for increased limits
- **Pro/Enterprise**: Custom pricing for high volume

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test locally
4. Deploy to Vercel with `vercel --preview`
5. Create pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the PureFlow water monitoring ecosystem**
