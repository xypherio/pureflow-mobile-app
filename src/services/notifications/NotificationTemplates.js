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

  static forecastReminder() {
    return {
      title: '🌅 Water Parameter Forecast Ready',
      body: 'Tomorrow\'s water parameter forecast is ready for viewing. Check your PureFlow app to stay ahead of water quality trends.',
      data: {
        type: 'forecast_reminder',
        timestamp: new Date().toISOString(),
        category: 'reminders',
        deepLink: 'pureflow://forecast'
      },
      categoryId: 'reminders',
      priority: 'normal'
    };
  }

  static reportReminder() {
    return {
      title: '📊 Daily Report Available',
      body: 'Your daily water quality report is ready. Tap to view today\'s comprehensive analysis.',
      data: {
        type: 'report_reminder',
        timestamp: new Date().toISOString(),
        category: 'reminders',
        deepLink: 'pureflow://report'
      },
      categoryId: 'reminders',
      priority: 'normal'
    };
  }

  static borderlineAlert(parameter, value, threshold, direction) {
    const status = direction === 'high' ? 'approaching maximum' : 'approaching minimum';
    const emoji = direction === 'high' ? '📈' : '📉';

    return {
      title: `${emoji} Parameter Warning`,
      body: `${parameter} (${value}) is ${status} threshold (${threshold}). Consider taking preventive action.`,
      data: {
        type: 'borderline_alert',
        parameter: parameter.toLowerCase(),
        value,
        threshold,
        direction,
        timestamp: new Date().toISOString(),
        category: 'alerts'
      },
      categoryId: 'alerts',
      priority: 'normal'
    };
  }

  static connectionUnstable(deviceName = 'DATM', attemptCount = 0) {
    const attempts = attemptCount > 0 ? ` (${attemptCount} failed attempts)` : '';

    return {
      title: '⚠️ Device Connection Unstable',
      body: `${deviceName} connection is unstable${attempts}. Please check for potential problems.`,
      data: {
        type: 'connection_unstable',
        deviceName,
        attemptCount,
        timestamp: new Date().toISOString(),
        category: 'system'
      },
      categoryId: 'alerts',
      priority: 'high'
    };
  }

  static deviceUnstable(deviceName = 'DATM') {
    return {
      title: '🚨 DATM Unstable',
      body: `${deviceName} is unstable. Multiple fetch attempts failed. Check for potential problems.`,
      data: {
        type: 'device_unstable',
        deviceName,
        timestamp: new Date().toISOString(),
        category: 'alerts'
      },
      categoryId: 'alerts',
      priority: 'high'
    };
  }

  static harmfulStateAlert(parameters, affectedCount) {
    const count = affectedCount > 1 ? ` (${affectedCount} parameters)` : '';
    const params = parameters.join(', ');

    return {
      title: '🚨 Harmful Water Parameters Detected',
      body: `${params}${count} are in harmful state. Tap to open PureFlow and take action.`,
      data: {
        type: 'harmful_state_alert',
        parameters: parameters.map(p => p.toLowerCase()),
        affectedCount,
        timestamp: new Date().toISOString(),
        category: 'alerts',
        deepLink: 'pureflow://alerts'
      },
      categoryId: 'alerts',
      priority: 'high'
    };
  }

  static monitoringReminder(hoursInterval = 4) {
    return {
      title: '🌊 Time to Monitor Water Parameters',
      body: `It's been a while! Open PureFlow to check your water quality parameters and ensure everything is running smoothly.`,
      data: {
        type: 'monitoring_reminder',
        hoursInterval,
        timestamp: new Date().toISOString(),
        category: 'reminders',
        deepLink: 'pureflow://parameters'
      },
      categoryId: 'reminders',
      priority: 'normal'
    };
  }
}
