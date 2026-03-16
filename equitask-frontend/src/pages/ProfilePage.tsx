import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Avatar, Grid, Chip, Divider, Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { toast } from 'react-toastify';
import api from '../services/api';
import { getCurrentUser } from '../store/slices/authSlice';

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    department: user?.department || '',
    phone: user?.phone || '',
  });

  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (skills.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error('Skill already added');
      return;
    }
    setSkills([...skills, trimmed]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/me/', { ...formData, skills });
      await dispatch(getCurrentUser());
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E', mb: 0.5 }}>
          Profile
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 4 }}>
          Manage your personal information and skills
        </Typography>

        <Grid container spacing={3}>
          {/* Left — Avatar + role info */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{
                width: 90, height: 90,
                bgcolor: '#028090', fontSize: 32,
                fontWeight: 700, mx: 'auto', mb: 2,
              }}>
                {initials || <PersonIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#1A3C5E' }}>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1.5 }}>
                {user?.email}
              </Typography>
              <Chip
                label={user?.role?.replace('_', ' ') || 'team member'}
                sx={{
                  bgcolor: '#028090', color: 'white',
                  fontWeight: 600, textTransform: 'capitalize', fontSize: 12,
                }}
              />

              <Divider sx={{ my: 2.5 }} />

              {/* Skills summary */}
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1A3C5E', mb: 1.5, textAlign: 'left' }}>
                Your Skills
              </Typography>
              {skills.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  No skills added yet. Add skills below to improve task recommendations.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {skills.map(skill => (
                    <Chip
                      key={skill}
                      label={skill}
                      size="small"
                      onDelete={() => handleRemoveSkill(skill)}
                      sx={{
                        bgcolor: '#E8F4F6', color: '#028090',
                        fontWeight: 500, fontSize: 11,
                        '& .MuiChip-deleteIcon': { color: '#028090', fontSize: 14 },
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Why skills matter */}
              <Box sx={{
                mt: 2, p: 1.5, bgcolor: '#F0FAFB',
                borderRadius: 2, textAlign: 'left',
              }}>
                <Typography variant="caption" sx={{ color: '#028090', fontWeight: 600 }}>
                  💡 Why skills matter
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.3 }}>
                  The task recommendation engine uses your skills to match you with the most suitable tasks.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Right — Edit form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E', mb: 2.5 }}>
                Personal Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="First Name" name="first_name"
                    value={formData.first_name} onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Last Name" name="last_name"
                    value={formData.last_name} onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Username" name="username"
                    value={formData.username} onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Phone" name="phone"
                    value={formData.phone} onChange={handleChange}
                    placeholder="+254 700 000 000"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Department" name="department"
                    value={formData.department} onChange={handleChange}
                    placeholder="e.g. Engineering, Design, Marketing"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Email address"
                    value={user?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Skills editor */}
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E', mb: 0.5 }}>
                Skills
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
                Add skills that will be used to match you with relevant tasks
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Python, React, UI Design..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  variant="contained"
                  onClick={handleAddSkill}
                  startIcon={<AddIcon />}
                  sx={{
                    bgcolor: '#028090', '&:hover': { bgcolor: '#025F6B' },
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  Add
                </Button>
              </Box>

              {skills.length > 0 && (
                <Box sx={{
                  display: 'flex', flexWrap: 'wrap', gap: 1,
                  p: 2, bgcolor: '#F8FAFC', borderRadius: 2,
                  border: '1px solid #EEF2F6', mb: 2,
                }}>
                  {skills.map(skill => (
                    <Chip
                      key={skill}
                      label={skill}
                      onDelete={() => handleRemoveSkill(skill)}
                      sx={{
                        bgcolor: '#E8F4F6', color: '#028090',
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': { color: '#028090' },
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Save button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    bgcolor: '#028090', '&:hover': { bgcolor: '#025F6B' },
                    px: 4,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default ProfilePage;