import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Grid, Divider, Switch,
  Alert, Stack,
} from '@mui/material';
import {
  Lock as LockIcon,
  Notifications as NotifIcon,
  PersonOff as DeactivateIcon,
  Save as SaveIcon,
  Visibility, VisibilityOff,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { IconButton, InputAdornment } from '@mui/material';
import Layout from '../components/layout/Layout';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { clearSession } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../store/store';
import { useThemeContext } from '../context/ThemeContext';
import { apiErrorMessage } from '../utils/apiError';

// In-app alerts the backend sends (see apps/notifications); there is no email.
const ALERTS = [
  { label: 'New assignments', sub: 'When a task is assigned to you' },
  { label: 'Deadline reminders', sub: '48 and 24 hours before a task is due' },
  { label: 'Overdue alerts', sub: 'When one of your open tasks passes its deadline' },
  { label: 'Progress updates', sub: 'When a task you are on changes status, or one you created is completed' },
];

const CONFIRM_WORD = 'DEACTIVATE';

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = ({ icon, title, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Box sx={{
      width: 38, height: 38, borderRadius: '10px',
      bgcolor: 'var(--accent-soft)', display: 'flex',
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

  // Deactivate account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update password'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (deleteConfirm !== CONFIRM_WORD) {
      toast.error(`Type ${CONFIRM_WORD} to confirm`);
      return;
    }
    setDeactivating(true);
    try {
      await api.delete('/auth/me/');
      // The server has already revoked every session for this account.
      dispatch(clearSession());
      navigate('/login');
      toast.success('Account deactivated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to deactivate account'));
      setDeactivating(false);
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
          <Grid
            size={{
              xs: 12,
              md: 7
            }}>
            <Stack spacing={3}>

              {/* Change Password */}
              <Paper sx={{ p: 3 }}>
                <SectionHeader
                  icon={<LockIcon sx={{ color: 'var(--accent)', fontSize: 20 }} />}
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
                            aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
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
                            aria-label={showNew ? 'Hide new password' : 'Show new password'}
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
                        bgcolor: 'var(--accent)',
                        '&:hover': { bgcolor: 'var(--accent-dark)' },
                      }}
                    >
                      {savingPassword ? 'Saving...' : 'Update Password'}
                    </Button>
                  </Box>
                </Stack>
              </Paper>

              {/* Notifications */}
              <Paper sx={{ p: 3 }}>
                <SectionHeader
                  icon={<NotifIcon sx={{ color: 'var(--accent)', fontSize: 20 }} />}
                  title="Notifications"
                  subtitle="Alerts appear in the bell at the top of every page"
                />

                <Stack spacing={0}>
                  {ALERTS.map((item, index) => (
                    <React.Fragment key={item.label}>
                      <Box sx={{ py: 1.5 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1A3C5E' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {item.sub}
                        </Typography>
                      </Box>
                      {index < ALERTS.length - 1 && (
                        <Divider sx={{ borderColor: '#F1F5F9' }} />
                      )}
                    </React.Fragment>
                  ))}
                </Stack>
              </Paper>

            </Stack>
          </Grid>

          {/* Right column */}
          <Grid
            size={{
              xs: 12,
              md: 5
            }}>
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
                        component="button"
                        type="button"
                        aria-label={`${theme.label} accent`}
                        aria-pressed={accentColor === theme.color}
                        onClick={() => {
                        setAccentColor(theme.color);
                        toast.success(`${theme.label} theme applied`);
                        }}
                        sx={{
                        width: 30, height: 30, p: 0,
                        borderRadius: '50%',
                        bgcolor: theme.color,
                        cursor: 'pointer',
                        border: accentColor === theme.color
                            ? '3px solid #1A3C5E'
                            : '3px solid transparent',
                        transition: 'transform 0.15s ease',
                        '&:hover': { transform: 'scale(1.15)' },
                        '&:focus-visible': { outline: '2px solid #1A3C5E', outlineOffset: 2 },
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
                          borderColor: 'var(--accent)',
                          color: 'var(--accent)',
                          bgcolor: 'var(--accent-softer)',
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
                  icon={<DeactivateIcon sx={{ color: '#f44336', fontSize: 20 }} />}
                  title="Danger Zone"
                  subtitle="Account actions"
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
                    Deactivate My Account
                  </Button>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity="error" sx={{ fontSize: 12 }}>
                      You will be signed out everywhere and will not be able to sign in again.
                      Your completed work stays in the team history so fairness analytics stay
                      accurate. An administrator can reactivate the account.
                    </Alert>
                    <TextField
                      fullWidth
                      size="small"
                      label={`Type "${CONFIRM_WORD}" to confirm`}
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
                        onClick={handleDeactivateAccount}
                        disabled={deleteConfirm !== CONFIRM_WORD || deactivating}
                        sx={{
                          bgcolor: '#f44336',
                          '&:hover': { bgcolor: '#d32f2f' },
                          '&:disabled': { bgcolor: '#FEECEC', color: '#f44336' },
                        }}
                      >
                        {deactivating ? 'Deactivating...' : 'Deactivate'}
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