const { getMessaging } = require('./firebase-admin');

async function sendNotification(fcmToken, notification) {
  try {
    if (!fcmToken) throw new Error('FCM token required');

    const messaging = getMessaging();
    const response = await messaging.send({ token: fcmToken, ...notification });

    console.log('✅ Notification sent:', {
      messageId: response,
      tokenPrefix: fcmToken.substring(0, 10) + '...',
      title: notification.notification?.title
    });

    return { success: true, messageId: response, timestamp: new Date().toISOString() };

  } catch (error) {
    console.error('❌ Notification failed:', {
      error: error.message,
      tokenPrefix: fcmToken?.substring(0, 10) + '...',
      code: error.code
    });

    return {
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };
  }
}

async function sendWaterQualityAlert(fcmToken, sensorData) {
  const { sensorId = 'sensor-001', parameter = 'ph', value = 8.5, threshold = 7.5, unit = '', location = '' } = sensorData;

  const parameterNames = { ph: 'pH', temperature: 'Temperature', turbidity: 'Turbidity', salinity: 'Salinity', dissolved_oxygen: 'Dissolved Oxygen', conductivity: 'Conductivity' };
  const parameterName = parameterNames[parameter] || parameter;
  const isHigh = value > threshold;
  const status = isHigh ? 'HIGH' : 'LOW';
  const severity = isHigh ? 'critical' : 'warning';

  const alertNotification = {
    notification: {
      title: `${parameterName} Alert! ${status}`,
      body: `${parameterName} level is ${status}${location ? ` at ${location}` : ''}: ${value}${unit} (threshold: ${threshold}${unit})`
    },
    data: {
      type: 'water_quality_alert',
      sensorId: sensorId.toString(),
      parameter, value: value.toString(),
      threshold: threshold.toString(),
      unit, location, severity,
      timestamp: new Date().toISOString()
    },
    android: {
      priority: severity === 'critical' ? 'high' : 'normal',
      notification: {
        channel_id: severity === 'critical' ? 'alerts' : 'updates',
        priority: severity === 'critical' ? 2 : 1,
        color: severity === 'critical' ? '#dc2626' : '#f59e0b',
        sound: severity === 'critical' ? 'water_alert' : 'default',
        vibrationTimingsMillis: severity === 'critical' ? [0, 500, 200, 500] : [0, 250, 250, 250]
      }
    },
    apns: {
      payload: {
        aps: {
          alert: { title: `${parameterName} Alert!`, body: `${parameterName} level is ${status}` },
          badge: severity === 'critical' ? 1 : 0,
          sound: severity === 'critical' ? 'water-alert.mp3' : 'default',
          'content-available': 1
        }
      }
    }
  };

  return await sendNotification(fcmToken, alertNotification);
}

async function sendMaintenanceReminder(fcmToken, reminderData) {
  const { type = 'general_maintenance', task = 'maintenance check', dueDate = '', daysDue = 0, sensorId = '' } = reminderData;

  const maintenanceNotification = {
    notification: {
      title: 'Maintenance Reminder',
      body: `${task}${dueDate ? ` (Due: ${dueDate})` : ''}${daysDue > 0 ? ` (${daysDue} days)` : ''}`
    },
    data: {
      type: 'maintenance_reminder',
      maintenanceType: type, task, dueDate,
      daysDue: daysDue.toString(),
      sensorId,
      timestamp: new Date().toISOString()
    },
    android: {
      priority: 'normal',
      notification: {
        channel_id: 'maintenance',
        color: '#059669',
        sound: 'default',
        vibrationTimingsMillis: [0, 250, 200, 250]
      }
    },
    apns: {
      payload: {
        aps: {
          alert: { title: 'Maintenance Reminder', body: task },
          sound: 'default',
          'content-available': 1
        }
      }
    }
  };

  return await sendNotification(fcmToken, maintenanceNotification);
}

async function sendForecastAlert(fcmToken, forecastData) {
  const { parameter = 'water_quality', prediction = '', timeframe = '24 hours', impact = 'impact' } = forecastData;

  const forecastNotification = {
    notification: {
      title: 'Forecast Alert',
      body: `${parameter} predicted to ${prediction} within ${timeframe}. ${impact}`
    },
    data: {
      type: 'forecast_alert',
      parameter, prediction, timeframe, impact,
      timestamp: new Date().toISOString()
    },
    android: {
      priority: 'normal',
      notification: { channel_id: 'forecasts', color: '#3b82f6', sound: 'default' }
    },
    apns: {
      payload: {
        aps: {
          alert: { title: 'Forecast Alert', body: `${parameter} prediction: ${timeframe}` },
          sound: 'default',
          'content-available': 1
        }
      }
    }
  };

  return await sendNotification(fcmToken, forecastNotification);
}

async function sendCustomNotification(fcmToken, customData) {
  const { title = 'PureFlow Notification', body = '', data = {}, priority = 'normal', sound = 'default', type = 'custom' } = customData;

  const customNotification = {
    notification: {
      title,
      body
    },
    data: {
      type: type,
      ...data,
      timestamp: new Date().toISOString()
    },
    android: {
      priority,
      notification: {
        channel_id: priority === 'high' ? 'alerts' : 'updates',
        sound: sound === 'critical_alert' ? 'critical_alert' : 'default'
      }
    },
    apns: {
      payload: {
        aps: { alert: { title, body }, sound, 'content-available': 1 }
      }
    }
  };

  return await sendNotification(fcmToken, customNotification);
}

module.exports = {
  sendNotification,
  sendWaterQualityAlert,
  sendMaintenanceReminder,
  sendForecastAlert,
  sendCustomNotification
};
