import React from 'react';
import {
  Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Box, Typography,
  Avatar, Divider, Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as TasksIcon,
  PersonPin as MyTasksIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';


export const DRAWER_WIDTH = 240;
export const COLLAPSED_WIDTH = 64;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
  { label: 'All Tasks', icon: <TasksIcon fontSize="small" />, path: '/tasks' },
  { label: 'My Tasks', icon: <MyTasksIcon fontSize="small" />, path: '/my-tasks' },
  { label: 'Analytics', icon: <AnalyticsIcon fontSize="small" />, path: '/analytics' },
  { label: 'Profile', icon: <ProfileIcon fontSize="small" />, path: '/profile' },
  { label: 'Settings', icon: <SettingsIcon fontSize="small" />, path: '/settings' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

const DrawerContent: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: '100%', bgcolor: '#1A3C5E',
      width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <Box sx={{
        px: collapsed ? 1 : 2.5, py: 2.5,
        display: 'flex', alignItems: 'center',
        gap: 1.5, minHeight: 64,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '11px',
          bgcolor: '#028090', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 18 }}>E</Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>
              EquiTask
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.5px' }}>
              TASK MANAGER
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: collapsed ? 1 : 2 }} />

      {/* Nav items */}
      <List sx={{
        flex: 1, px: collapsed ? 0.5 : 1.5,
        pt: 2, display: 'flex',
        flexDirection: 'column', gap: 0.5,
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    borderRadius: '10px',
                    py: 1.1,
                    px: collapsed ? 1 : 1.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: isActive ? 'rgba(2,128,144,0.9)' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive
                        ? 'rgba(2,128,144,0.9)'
                        : 'rgba(255,255,255,0.07)',
                    },
                    transition: 'background-color 0.15s ease',
                    minWidth: 0,
                  }}
                >
                  <ListItemIcon sx={{
                    color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                    minWidth: collapsed ? 0 : 36,
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                      }}
                    />
                  )}
                  {!collapsed && isActive && (
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%',
                      bgcolor: 'white', opacity: 0.8,
                    }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* User footer */}
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: collapsed ? 1 : 2 }} />
      <Box sx={{
        p: collapsed ? 1 : 2,
        display: 'flex', alignItems: 'center',
        gap: 1.5, justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Avatar sx={{
          width: 34, height: 34, bgcolor: '#028090',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {initials || '?'}
        </Avatar>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography sx={{
              color: 'white', fontSize: 13,
              fontWeight: 600, lineHeight: 1.3,
            }} noWrap>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography sx={{
              color: 'rgba(255,255,255,0.45)', fontSize: 11,
              textTransform: 'capitalize', lineHeight: 1.3,
            }}>
              {user?.role || 'Member'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, collapsed }) => {
  return (
    <>
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            transition: 'width 0.2s ease',
            overflowX: 'hidden',
          },
        }}
        open
      >
        <DrawerContent collapsed={collapsed} />
      </Drawer>
    </>
  );
};

export default Sidebar;