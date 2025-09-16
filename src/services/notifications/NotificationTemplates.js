export const NotificationTemplates = {
  // Water quality alerts
  waterQualityAlert: (parameter, value, status) => ({
    title: `Water Quality Alert: ${parameter}`,
    body: `${parameter} level is ${status}. Current value: ${value}`,
    data: {
      type: 'water_quality_alert',
      parameter,
      value,
      status,
      category: 'alerts'
    },
    categoryId: 'alerts',
    priority: 'high'
  }),

  // System status notifications
  systemStatus: (status, message) => ({
    title: 'System Status Update',
    body: message,
    data: {
      type: 'system_status',
      status,
      category: 'updates'
    },
    categoryId: 'updates'
  }),

  // Device connectivity
  deviceOffline: (deviceName, lastSeen) => ({
    title: 'Device Disconnected',
    body: `${deviceName} went offline. Last seen: ${lastSeen}`,
    data: {
      type: 'device_offline',
      deviceName,
      lastSeen,
      category: 'alerts'
    },
    categoryId: 'alerts',
    priority: 'high'
  }),

  deviceOnline: (deviceName) => ({
    title: 'Device Reconnected',
    body: `${deviceName} is back online`,
    data: {
      type: 'device_online',
      deviceName,
      category: 'updates'
    },
    categoryId: 'updates'
  }),

  // Maintenance reminders
  maintenanceReminder: (task, dueDate) => ({
    title: 'Maintenance Reminder',
    body: `${task} is due on ${dueDate}`,
    data: {
      type: 'maintenance_reminder',
      task,
      dueDate,
      category: 'reminders'
    },
    categoryId: 'reminders'
  }),

  // Calibration alerts
  calibrationNeeded: (parameter, lastCalibrated) => ({
    title: 'Calibration Required',
    body: `${parameter} sensor needs calibration. Last calibrated: ${lastCalibrated}`,
    data: {
      type: 'calibration_needed',
      parameter,
      lastCalibrated,
      category: 'alerts'
    },
    categoryId: 'alerts'
  }),

  // Battery alerts
  lowBattery: (deviceName, batteryLevel) => ({
    title: 'Low Battery Warning',
    body: `${deviceName} battery is at ${batteryLevel}%. Please charge soon.`,
    data: {
      type: 'low_battery',
      deviceName,
      batteryLevel,
      category: 'alerts'
    },
    categoryId: 'alerts'
  }),

  // Data sync notifications
  dataSyncComplete: (recordCount) => ({
    title: 'Data Sync Complete',
    body: `Successfully synced ${recordCount} new records`,
    data: {
      type: 'data_sync',
      recordCount,
      category: 'updates'
    },
    categoryId: 'updates'
  }),

  dataSyncFailed: (error) => ({
    title: 'Data Sync Failed',
    body: `Unable to sync data: ${error}`,
    data: {
      type: 'data_sync_failed',
      error,
      category: 'alerts'
    },
    categoryId: 'alerts'
  })
};