import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../../services/notificationService';
import { NotificationState } from '../../types/notification.types';

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async () => {
  const data = await notificationService.getNotifications();
  // Ensure we return an array
  return Array.isArray(data) ? data : (data.results || []);
});

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
  return await notificationService.getUnreadCount();
});

export const markAsRead = createAsyncThunk('notifications/markAsRead', async (id: number) => {
  await notificationService.markAsRead(id);
  return id;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      state.loading = false;
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.is_read).length;
    });

    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });
  },
});

export default notificationSlice.reducer;