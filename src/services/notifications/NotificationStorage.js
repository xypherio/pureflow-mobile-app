import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service for storing and managing notification history locally
 */
class NotificationStorage {
  constructor() {
    this.STORAGE_KEY = 'notification_history';
    this.MAX_STORED_NOTIFICATIONS = 100;
  }

  /**
   * Store a notification in local history
   */
  async storeNotification(notification) {
    try {
      const history = await this.getNotificationHistory();
      
      const notificationRecord = {
        id: notification.id || Date.now().toString(),
        title: notification.title,
        body: notification.body,
        data: notification.data,
        timestamp: new Date().toISOString(),
        read: false,
        type: notification.data?.type || 'general'
      };

      history.unshift(notificationRecord);
      
      // Keep only the most recent notifications
      if (history.length > this.MAX_STORED_NOTIFICATIONS) {
        history.splice(this.MAX_STORED_NOTIFICATIONS);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      return { success: true, id: notificationRecord.id };
    } catch (error) {
      console.error('❌ Error storing notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory() {
    try {
      const historyJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('❌ Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const history = await this.getNotificationHistory();
      const notification = history.find(n => n.id === notificationId);
      
      if (notification) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        return { success: true };
      }
      
      return { success: false, error: 'Notification not found' };
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const history = await this.getNotificationHistory();
      return history.filter(n => !n.read).length;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Clear all notification history
   */
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing notification history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete specific notification
   */
  async deleteNotification(notificationId) {
    try {
      const history = await this.getNotificationHistory();
      const filteredHistory = history.filter(n => n.id !== notificationId);
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHistory));
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }
}

export const notificationStorage = new NotificationStorage();
export default notificationStorage;