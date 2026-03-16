import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Toolbar, Typography, IconButton,
  Menu, MenuItem, Box, Avatar, Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import NotificationBell from '../notifications/NotificationBell';
import { logout } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { DRAWER_WIDTH } from './Sidebar';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleClose();
    try {
      await dispatch(logout()).unwrap();
    } catch {}
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid #EEF2F6',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        ml: { sm: `${DRAWER_WIDTH}px` },
        width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important' }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ color: '#1A3C5E', mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ color: '#64748B', fontSize: 13 }}>
            {today}
          </Typography>
        </Box>

        <NotificationBell />

        <IconButton onClick={handleMenu} sx={{ p: 0.5, ml: 0.5 }}>
          <Avatar sx={{
            width: 34, height: 34, bgcolor: '#028090',
            fontSize: 12, fontWeight: 700,
          }}>
            {initials || '?'}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            elevation: 2,
            sx: { mt: 1, minWidth: 200, borderRadius: 2 }
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600} color="#1A3C5E">
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
              {user?.role}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => { navigate('/profile'); handleClose(); }}
            sx={{ fontSize: 14, gap: 1.5, py: 1.2 }}
          >
            <PersonIcon fontSize="small" sx={{ color: '#64748B' }} />
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => { navigate('/settings'); handleClose(); }}
            sx={{ fontSize: 14, gap: 1.5, py: 1.2 }}
          >
            <SettingsIcon fontSize="small" sx={{ color: '#64748B' }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            sx={{ fontSize: 14, gap: 1.5, py: 1.2, color: '#f44336' }}
          >
            <LogoutIcon fontSize="small" />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;