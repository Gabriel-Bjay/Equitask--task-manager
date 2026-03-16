import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconButton, Badge, Menu, Box,
  Typography, Divider, Button, MenuItem,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll as DoneAllIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../../store/store';
import { fetchNotifications, markAsRead } from '../../store/slices/notificationSlice';
import { format } from 'date-fns';
import api from '../../services/api';

const TYPE_COLORS: Record<string, string> = {
  task_assigned: '#028090',
  task_completed: '#4caf50',
  task_overdue: '#f44336',
  deadline_reminder_24h: '#ff9800',
  deadline_reminder_48h: '#ff9800',
  task_reassigned: '#1976d2',
  system_announcement: '#9c27b0',
};

const NotificationBell: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, unreadCount } = useSelector(
    (state: RootState) => state.notifications
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    dispatch(fetchNotifications());
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAsRead = (id: number) => {
    dispatch(markAsRead(id));
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      dispatch(fetchNotifications());
    } catch {
      console.error('Failed to mark all read');
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: '#64748B' }}>
        <Badge
          badgeContent={unreadCount}
          color="error"
          sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380, maxHeight: 500,
            borderRadius: 3,
            border: '1px solid #EEF2F6',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            mt: 1,
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2.5, py: 2,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A3C5E' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                {unreadCount} unread
              </Typography>
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />}
              onClick={handleMarkAllRead}
              sx={{
                fontSize: 12, color: '#028090',
                textTransform: 'none', fontWeight: 600,
              }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider sx={{ borderColor: '#F1F5F9' }} />

        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <NotificationsIcon sx={{ fontSize: 40, color: '#E2E8F0', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.slice(0, 10).map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => {
                  if (!notification.is_read) {
                    handleMarkAsRead(notification.id);
                  }
                  handleClose();
                }}
                sx={{
                  px: 2.5, py: 1.5,
                  whiteSpace: 'normal',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  bgcolor: notification.is_read ? 'white' : '#F0FAFB',
                  borderBottom: '1px solid #F1F5F9',
                  '&:hover': { bgcolor: '#F8FAFC' },
                }}
              >
                {/* Colour dot */}
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: TYPE_COLORS[notification.notification_type] || '#028090',
                  mt: 0.7,
                }} />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', mb: 0.3,
                  }}>
                    <Typography sx={{
                      fontSize: 13, fontWeight: notification.is_read ? 500 : 700,
                      color: '#1A3C5E', lineHeight: 1.3,
                      pr: 1,
                    }}>
                      {notification.title}
                    </Typography>
                    {!notification.is_read && (
                      <CircleIcon sx={{ fontSize: 8, color: '#028090', flexShrink: 0, mt: 0.4 }} />
                    )}
                  </Box>
                  <Typography sx={{
                    fontSize: 12, color: '#64748B', lineHeight: 1.5, mb: 0.5,
                  }}>
                    {notification.message}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                    {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;