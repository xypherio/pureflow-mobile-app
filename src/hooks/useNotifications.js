import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationManager } from '../services/notifications/NotificationManager';
import { notificationStorage } from '../services/notifications/NotificationStorage';
import { NotificationTemplates } from '../services/notifications/NotificationTemplates';

/**
 * React hook for managing notifications in components
 */
export function useNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [deviceToken, setDeviceToken] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const listenersRef = useRef([]);

  /**
   * Initialize notifications and load history
   */
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize notification manager
      const initResult = await notificationManager.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error);
      }

      setIsInitialized(true);
      setHasPermission(initResult.hasPermission);

      // Get device token if we have permission
      if (initResult.hasPermission) {
        const tokenResult = await notificationManager.getDeviceToken();
        if (tokenResult.success) {
          setDeviceToken(tokenResult.token);
        }
      }

      // Load notification history
      await loadNotificationHistory();

    } catch (err) {
      console.error('❌ Error initializing notifications hook:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Request notification permissions
   */
  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      const result = await notificationManager.requestPermissions();
      
      if (result.success) {
        setHasPermission(true);
        
        // Get device token after permission granted
        const tokenResult = await notificationManager.getDeviceToken();
        if (tokenResult.success) {
          setDeviceToken(tokenResult.token);
        }
      } else {
        setHasPermission(false);
        setError('Permission denied or unavailable');
      }

      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send a local notification
   */
  const sendNotification = useCallback(async (options) => {
    try {
      const result = await notificationManager.sendLocalNotification(options);
      
      if (result.success) {
        // Store in local history
        await notificationStorage.storeNotification({
          id: result.notificationId,
          title: options.title,
          body: options.body,
          data: options.data
        });
        
        // Refresh history
        await loadNotificationHistory();
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error sending notification:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Send notification using a template
   */
  const sendTemplateNotification = useCallback(async (templateName, ...args) => {
    try {
      const template = NotificationTemplates[templateName];
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      const notificationOptions = template(...args);
      return await sendNotification(notificationOptions);
    } catch (err) {
      console.error('❌ Error sending template notification:', err);
      return { success: false, error: err.message };
    }
  }, [sendNotification]);

  /**
   * Load notification history from storage
   */
  const loadNotificationHistory = useCallback(async () => {
    try {
      const history = await notificationStorage.getNotificationHistory();
      const unread = await notificationStorage.getUnreadCount();
      
      setNotificationHistory(history);
      setUnreadCount(unread);
    } catch (err) {
      console.error('❌ Error loading notification history:', err);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await notificationStorage.markAsRead(notificationId);
      if (result.success) {
        await loadNotificationHistory();
      }
      return result;
    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
      return { success: false, error: err.message };
    }
  }, [loadNotificationHistory]);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationManager.clearAllDeliveredNotifications();
      await notificationStorage.clearHistory();
      await loadNotificationHistory();
      return { success: true };
    } catch (err) {
      console.error('❌ Error clearing notifications:', err);
      return { success: false, error: err.message };
    }
  }, [loadNotificationHistory]);

  /**
   * Add notification listener
   */
  const addNotificationListener = useCallback((type, callback) => {
    let listener;
    
    if (type === 'received') {
      listener = notificationManager.addNotificationReceivedListener(async (notification) => {
        // Store received notification
        await notificationStorage.storeNotification({
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data
        });
        
        // Refresh history
        await loadNotificationHistory();
        
        // Call user callback
        callback(notification);
      });
    } else if (type === 'response') {
      listener = notificationManager.addNotificationResponseListener(async (response) => {
        // Mark as read when user taps
        const notificationData = response.notification.request.content.data;
        if (notificationData?.id) {
          await markAsRead(notificationData.id);
        }
        
        // Call user callback
        callback(response);
      });
    }

    if (listener) {
      listenersRef.current.push(listener);
      return listener;
    }
    
    return null;
  }, [loadNotificationHistory, markAsRead]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    
    // Cleanup on unmount
    return () => {
      listenersRef.current.forEach(listener => {
        if (listener?.remove) {
          listener.remove();
        }
      });
      listenersRef.current = [];
    };
  }, [initialize]);

  return {
    // State
    isInitialized,
    hasPermission,
    deviceToken,
    notificationHistory,
    unreadCount,
    loading,
    error,
    
    // Actions
    initialize,
    requestPermission,
    sendNotification,
    sendTemplateNotification,
    markAsRead,
    clearAllNotifications,
    addNotificationListener,
    loadNotificationHistory,
    
    // Utilities
    templates: NotificationTemplates,
    manager: notificationManager,
    storage: notificationStorage
  };
}
