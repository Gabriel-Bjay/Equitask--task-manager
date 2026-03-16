import api from './api';
import { Notification } from '../types/notification.types';

export const notificationService = {
  // Get all notifications
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications/');
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count/');
    return response.data.count;
  },

  // Mark as read
  markAsRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/`, { is_read: true });
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/mark-all-read/');
  },
};