import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
  Divider,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { AppDispatch, RootState } from '../../store/store';
import { fetchNotifications, markAsRead } from '../../store/slices/notificationSlice';
import { format } from 'date-fns';

const NotificationBell: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    dispatch(fetchNotifications());
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id: number) => {
    dispatch(markAsRead(id));
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead(notification.id);
                }
              }}
              sx={{
                backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                whiteSpace: 'normal',
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2">{notification.title}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        {notifications.length > 5 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small">View All</Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;