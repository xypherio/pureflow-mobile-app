class NotificationTemplates {
  static waterQualityAlert(parameter, value, status) {
    const severity = status === 'critical' ? 'Critical' : 'Warning';
    const emoji = status === 'critical' ? '🚨' : '⚠️';
    
    return {
      title: `${emoji} Water Quality Alert`,
      body: `${severity}: ${parameter} level is ${value}`,
      data: {
        type: 'water_quality_alert',
        parameter: parameter.toLowerCase(),
        value,
        status,
        timestamp: new Date().toISOString(),
        category: 'alerts'
      },
      categoryId: 'alerts',
      priority: status === 'critical' ? 'high' : 'normal',
      sound: status === 'critical' ? 'critical_alert' : 'default',
      vibration: status === 'critical' ? [0, 250, 250, 250] : [0, 100, 100, 100]
    };
  }

  static deviceOffline(deviceName, lastSeen) {
    return {
      title: '📡 Device Offline',
      body: `${deviceName} went offline. Last seen: ${lastSeen}`,
      data: {
        type: 'device_offline',
        deviceName,
        lastSeen,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'system',
      priority: 'normal'
    };
  }

  static deviceOnline(deviceName) {
    return {
      title: '✅ Device Online',
      body: `${deviceName} is back online`,
      data: {
        type: 'device_online',
        deviceName,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'system',
      priority: 'low'
    };
  }

  static lowBattery(deviceName, batteryLevel) {
    return {
      title: '🔋 Low Battery Warning',
      body: `${deviceName} battery is low (${batteryLevel}%)`,
      data: {
        type: 'low_battery',
        deviceName,
        batteryLevel,
        timestamp: new Date().toISOString(),
        category: 'maintenance'
      },
      categoryId: 'maintenance',
      priority: 'normal'
    };
  }

  static maintenanceReminder(task, dueDate) {
    const dueDateStr = new Date(dueDate).toLocaleDateString();
    
    return {
      title: '🔧 Maintenance Reminder',
      body: `${task} is due on ${dueDateStr}`,
      data: {
        type: 'maintenance_reminder',
        task,
        dueDate,
        timestamp: new Date().toISOString(),
        category: 'maintenance'
      },
      categoryId: 'maintenance',
      priority: 'normal'
    };
  }

  static dataSyncComplete(recordCount) {
    return {
      title: '☁️ Data Sync Complete',
      body: `Successfully synced ${recordCount} records`,
      data: {
        type: 'data_sync_complete',
        recordCount,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'system',
      priority: 'low'
    };
  }

  static dataSyncFailed(error) {
    return {
      title: '❌ Data Sync Failed',
      body: `Sync failed: ${error}`,
      data: {
        type: 'data_sync_failed',
        error,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'system',
      priority: 'high'
    };
  }

  static systemStatus(status, message) {
    const statusEmojis = {
      healthy: '✅',
      warning: '⚠️',
      error: '❌',
      maintenance: '🔧',
      system_alert: '🚨'
    };

    return {
      title: `${statusEmojis[status] || '📊'} System Status`,
      body: message,
      data: {
        type: 'system_status',
        status,
        message,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'system',
      priority: status === 'error' ? 'high' : 'normal'
    };
  }

  static forecastAlert(parameter, prediction, timeframe) {
    return {
      title: '🔮 Forecast Alert',
      body: `${parameter} predicted to breach limits in ${timeframe}`,
      data: {
        type: 'forecast_alert',
        parameter,
        prediction,
        timeframe,
        timestamp: new Date().toISOString(),
        category: 'predictions'
      },
      categoryId: 'predictions',
      priority: 'normal'
    };
  }

  static qualityReport(wqi, rating) {
    const ratingEmojis = {
      excellent: '🌟',
      good: '✅',
      fair: '⚠️',
      poor: '❌',
      veryPoor: '🚨'
    };

    return {
      title: `${ratingEmojis[rating] || '📊'} Water Quality Report`,
      body: `Current WQI: ${wqi} (${rating.charAt(0).toUpperCase() + rating.slice(1)})`,
      data: {
        type: 'quality_report',
        wqi,
        rating,
        timestamp: new Date().toISOString(),
        category: 'reports'
      },
      categoryId: 'reports',
      priority: rating === 'poor' || rating === 'veryPoor' ? 'high' : 'normal'
    };
  }
}