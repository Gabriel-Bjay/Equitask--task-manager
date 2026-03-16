import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Grid, Divider, Switch, FormControlLabel,
  Alert, Stack,
} from '@mui/material';
import {
  Lock as LockIcon,
  Notifications as NotifIcon,
  DeleteForever as DeleteIcon,
  Save as SaveIcon,
  Visibility, VisibilityOff,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { IconButton, InputAdornment } from '@mui/material';
import Layout from '../components/layout/Layout';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../store/store';
import { useThemeContext } from '../context/ThemeContext';

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = ({ icon, title, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Box sx={{
      width: 38, height: 38, borderRadius: '10px',
      bgcolor: '#E8F4F6', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A3C5E' }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Password state
  const [passwords, setPasswords] = useState({
    current: '', newPass: '', confirm: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { accentColor, setAccentColor, compactMode, setCompactMode, animationsEnabled, setAnimationsEnabled } = useThemeContext();

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    emailDeadlines: true,
    emailAssignments: true,
    emailUpdates: false,
    inAppAll: true,
  });

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSavePassword = async () => {
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password/', {
        current_password: passwords.current,
        new_password: passwords.newPass,
      });
      toast.success('Password updated successfully');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.current_password?.[0] ||
        'Failed to update password'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleNotifToggle = (key: keyof typeof notifPrefs) => {
    setNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key] });
    toast.success('Preference saved');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    try {
      await api.delete('/auth/me/');
      dispatch(logout());
      navigate('/login');
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5, mb: 4 }}>
          Manage your account security and preferences
        </Typography>

        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>

              {/* Change Password */}
              <Paper sx={{ p: 3 }}>
                <SectionHeader
                  icon={<LockIcon sx={{ color: '#028090', fontSize: 20 }} />}
                  title="Change Password"
                  subtitle="Update your account password"
                />
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="current"
                    type={showCurrent ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrent(!showCurrent)}
                            edge="end" size="small"
                          >
                            {showCurrent
                              ? <VisibilityOff fontSize="small" />
                              : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPass"
                    type={showNew ? 'text' : 'password'}
                    value={passwords.newPass}
                    onChange={handlePasswordChange}
                    helperText="Minimum 8 characters"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNew(!showNew)}
                            edge="end" size="small"
                          >
                            {showNew
                              ? <VisibilityOff fontSize="small" />
                              : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirm"
                    type="password"
                    value={passwords.confirm}
                    onChange={handlePasswordChange}
                    error={
                      passwords.confirm.length > 0 &&
                      passwords.newPass !== passwords.confirm
                    }
                    helperText={
                      passwords.confirm.length > 0 &&
                      passwords.newPass !== passwords.confirm
                        ? "Passwords don't match"
                        : ''
                    }
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSavePassword}
                      disabled={savingPassword}
                      sx={{
                        bgcolor: '#028090',
                        '&:hover': { bgcolor: '#025F6B' },
                      }}
                    >
                      {savingPassword ? 'Saving...' : 'Update Password'}
                    </Button>
                  </Box>
                </Stack>
              </Paper>

              {/* Notification Preferences */}
              <Paper sx={{ p: 3 }}>
                <SectionHeader
                  icon={<NotifIcon sx={{ color: '#028090', fontSize: 20 }} />}
                  title="Notification Preferences"
                  subtitle="Choose what alerts you receive"
                />

                <Stack spacing={0}>
                  {[
                    {
                      key: 'emailDeadlines' as const,
                      label: 'Deadline reminders',
                      sub: 'Get emailed before tasks are due',
                    },
                    {
                      key: 'emailAssignments' as const,
                      label: 'Task assignments',
                      sub: 'Get emailed when a task is assigned to you',
                    },
                    {
                      key: 'emailUpdates' as const,
                      label: 'System updates',
                      sub: 'General platform news and announcements',
                    },
                    {
                      key: 'inAppAll' as const,
                      label: 'In-app notifications',
                      sub: 'Show alerts in the notification bell',
                    },
                  ].map((item, index, arr) => (
                    <React.Fragment key={item.key}>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                      }}>
                        <Box>
                          <Typography sx={{
                            fontSize: 14, fontWeight: 500, color: '#1A3C5E',
                          }}>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {item.sub}
                          </Typography>
                        </Box>
                        <Switch
                          checked={notifPrefs[item.key]}
                          onChange={() => handleNotifToggle(item.key)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#028090',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              bgcolor: '#028090',
                            },
                          }}
                        />
                      </Box>
                      {index < arr.length - 1 && (
                        <Divider sx={{ borderColor: '#F1F5F9' }} />
                      )}
                    </React.Fragment>
                  ))}
                </Stack>
              </Paper>

            </Stack>
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>

             {/* Theme Preferences */}
            <Paper sx={{ p: 3 }}>
            <SectionHeader
                icon={<PaletteIcon sx={{ color: accentColor, fontSize: 20 }} />}
                title="Appearance"
                subtitle="Customise how EquiTask looks"
            />
            <Stack spacing={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1A3C5E' }}>
                    Compact mode
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Reduce spacing and padding throughout the app
                    </Typography>
                </Box>
                <Switch
                    checked={compactMode}
                    onChange={() => {
                    setCompactMode(!compactMode);
                    toast.success(compactMode ? 'Compact mode off' : 'Compact mode on');
                    }}
                    sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accentColor },
                    }}
                />
                </Box>

                <Divider sx={{ borderColor: '#F1F5F9' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1A3C5E' }}>
                    Animations
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Enable hover effects and transitions
                    </Typography>
                </Box>
                <Switch
                    checked={animationsEnabled}
                    onChange={() => {
                    setAnimationsEnabled(!animationsEnabled);
                    toast.success(animationsEnabled ? 'Animations off' : 'Animations on');
                    }}
                    sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accentColor },
                    }}
                />
                </Box>

                <Divider sx={{ borderColor: '#F1F5F9', mt: 0.5 }} />

                {/* Colour selector */}
                <Box sx={{ py: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1A3C5E', mb: 0.5 }}>
                    Accent colour
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5 }}>
                    Changes apply instantly across the whole app
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {[
                    { color: '#028090', label: 'Teal' },
                    { color: '#1976d2', label: 'Blue' },
                    { color: '#7c3aed', label: 'Purple' },
                    { color: '#059669', label: 'Green' },
                    { color: '#dc2626', label: 'Red' },
                    ].map((theme) => (
                    <Box
                        key={theme.color}
                        onClick={() => {
                        setAccentColor(theme.color);
                        toast.success(`${theme.label} theme applied`);
                        }}
                        sx={{
                        width: 30, height: 30,
                        borderRadius: '50%',
                        bgcolor: theme.color,
                        cursor: 'pointer',
                        border: accentColor === theme.color
                            ? '3px solid #1A3C5E'
                            : '3px solid transparent',
                        transition: 'transform 0.15s ease',
                        '&:hover': { transform: 'scale(1.15)' },
                        }}
                    />
                    ))}
                </Box>
                </Box>
            </Stack>
            </Paper>
            
              {/* Quick links */}
              <Paper sx={{ p: 3 }}>
                <Typography sx={{
                  fontWeight: 700, fontSize: 15,
                  color: '#1A3C5E', mb: 2,
                }}>
                  Quick Links
                </Typography>
                <Stack spacing={1}>
                  {[
                    { label: 'Edit Profile', path: '/profile' },
                    { label: 'View My Tasks', path: '/my-tasks' },
                    { label: 'Analytics', path: '/analytics' },
                  ].map((link) => (
                    <Button
                      key={link.path}
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate(link.path)}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: '#EEF2F6',
                        color: '#1A3C5E',
                        fontWeight: 500,
                        '&:hover': {
                          borderColor: '#028090',
                          color: '#028090',
                          bgcolor: '#F0FAFB',
                        },
                      }}
                    >
                      {link.label}
                    </Button>
                  ))}
                </Stack>
              </Paper>

              {/* Danger zone */}
              <Paper sx={{
                p: 3,
                border: '1px solid #FEECEC',
                bgcolor: '#FFFAFA',
              }}>
                <SectionHeader
                  icon={<DeleteIcon sx={{ color: '#f44336', fontSize: 20 }} />}
                  title="Danger Zone"
                  subtitle="Permanent account actions"
                />

                {!showDeleteWarning ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setShowDeleteWarning(true)}
                    sx={{
                      borderColor: '#f44336',
                      color: '#f44336',
                      '&:hover': {
                        bgcolor: '#FEECEC',
                        borderColor: '#f44336',
                      },
                    }}
                  >
                    Delete My Account
                  </Button>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity="error" sx={{ fontSize: 12 }}>
                      This action is permanent and cannot be undone.
                      All your data will be deleted.
                    </Alert>
                    <TextField
                      fullWidth
                      size="small"
                      label='Type "DELETE" to confirm'
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => {
                          setShowDeleteWarning(false);
                          setDeleteConfirm('');
                        }}
                        sx={{ borderColor: '#E2E8F0', color: '#64748B' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== 'DELETE'}
                        sx={{
                          bgcolor: '#f44336',
                          '&:hover': { bgcolor: '#d32f2f' },
                          '&:disabled': { bgcolor: '#FEECEC', color: '#f44336' },
                        }}
                      >
                        Delete Account
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Paper>

            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default SettingsPage;