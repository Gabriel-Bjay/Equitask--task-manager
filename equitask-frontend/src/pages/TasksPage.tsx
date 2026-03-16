import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography, Box, Button, TextField, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography as MuiTypography,
  Chip, LinearProgress, Divider, CircularProgress,
  Avatar, Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import TaskCard from '../components/tasks/TaskCard';
import { fetchTasks, createTask } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { toast } from 'react-toastify';
import api from '../services/api';

interface Recommendation {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    skills: string[];
  };
  scores: {
    skill_match: number;
    workload: number;
    final: number;
  };
  active_tasks: number;
  matching_skills: string[];
  missing_skills: string[];
}

const TasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks } = useSelector((state: RootState) => state.tasks);
  const { user } = useSelector((state: RootState) => state.auth);

  const [showForm, setShowForm] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'development' as const,
    priority: 'medium' as const,
    estimated_hours: 8,
    complexity_score: 5,
    deadline: '',
    required_skills: '',
  });

  useEffect(() => {
    dispatch(fetchTasks(undefined));
  }, [dispatch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = formData.required_skills
        ? formData.required_skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await dispatch(createTask({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours,
        complexity_score: formData.complexity_score,
        deadline: formData.deadline || undefined,
        required_skills: skillsArray,
      })).unwrap();
      toast.success('Task created!');
      setShowForm(false);
      setFormData({
        title: '', description: '',
        category: 'development' as const,
        priority: 'medium' as const,
        estimated_hours: 8, complexity_score: 5,
        deadline: '', required_skills: '',
      });
      dispatch(fetchTasks(undefined));
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleOpenAssign = async (taskId: number, taskTitle: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(taskTitle);
    setAssignOpen(true);
    setLoadingRecs(true);
    setRecommendations([]);
    try {
      const data = await api.get(`/tasks/${taskId}/recommend/`);
      setRecommendations(data.data.recommendations);
    } catch {
      toast.error('Could not load recommendations');
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleAssign = async (
    userId: number,
    userName: string,
    isRecommended: boolean
  ) => {
    if (!selectedTaskId) return;
    setAssigningId(userId);
    try {
      await api.post(`/tasks/${selectedTaskId}/assign/`, {
        user_id: userId,
        justification: isRecommended
          ? 'Assigned via ML recommendation engine'
          : 'Manual assignment by manager',
      });
      toast.success(`Assigned to ${userName} ✓`);
      setAssignOpen(false);
      dispatch(fetchTasks(undefined));
    } catch {
      toast.error('Failed to assign task');
    } finally {
      setAssigningId(null);
    }
  };

  const isManager = user?.role === 'administrator' || user?.role === 'manager';

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#4caf50';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', mb: 3,
        }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
              All Tasks
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.3 }}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </Typography>
          </Box>
          {isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowForm(!showForm)}
              sx={{ bgcolor: '#028090', '&:hover': { bgcolor: '#025F6B' } }}
            >
              {showForm ? 'Cancel' : 'New Task'}
            </Button>
          )}
        </Box>

        {/* Create task form */}
        {showForm && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              mb: 4, p: 3, bgcolor: 'white',
              borderRadius: 3, border: '1px solid #EEF2F6',
            }}
          >
            <Typography sx={{
              fontSize: 16, fontWeight: 700,
              color: '#1A3C5E', mb: 2,
            }}>
              Create New Task
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth required label="Task Title"
                name="title" value={formData.title}
                onChange={handleChange}
              />
              <TextField
                fullWidth required multiline rows={3}
                label="Description" name="description"
                value={formData.description} onChange={handleChange}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth select label="Category"
                  name="category" value={formData.category}
                  onChange={handleChange} SelectProps={{ native: true }}
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="design">Design</option>
                  <option value="documentation">Documentation</option>
                  <option value="research">Research</option>
                  <option value="review">Review</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </TextField>
                <TextField
                  fullWidth select label="Priority"
                  name="priority" value={formData.priority}
                  onChange={handleChange} SelectProps={{ native: true }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth type="number" label="Estimated Hours"
                  name="estimated_hours" value={formData.estimated_hours}
                  onChange={handleChange} inputProps={{ min: 1, step: 0.5 }}
                />
                <TextField
                  fullWidth type="number" label="Complexity (1-10)"
                  name="complexity_score" value={formData.complexity_score}
                  onChange={handleChange} inputProps={{ min: 1, max: 10 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth type="datetime-local"
                  label="Deadline" name="deadline"
                  value={formData.deadline} onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth label="Required Skills"
                  name="required_skills"
                  value={formData.required_skills}
                  onChange={handleChange}
                  placeholder="Python, React, Design..."
                  helperText="Comma separated"
                />
              </Box>
              <Button
                type="submit" variant="contained" size="large"
                sx={{ bgcolor: '#028090', '&:hover': { bgcolor: '#025F6B' } }}
              >
                Create Task
              </Button>
            </Stack>
          </Box>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" sx={{ color: '#1A3C5E', fontWeight: 600 }}>
              No tasks yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
              {isManager
                ? 'Click "New Task" to create your first task'
                : 'No tasks have been created yet'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {tasks.map((task) => (
              <Box key={task.id}>
                <TaskCard 
                  task={task}
                  onStatusChange={() => dispatch(fetchTasks(undefined))}
                />
                {isManager && task.status === 'pending' && (
                  <Box sx={{ mb: 2, mt: -1.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleOpenAssign(task.id, task.title)}
                      sx={{
                        fontSize: 12,
                        borderColor: '#028090',
                        color: '#028090',
                        borderRadius: '0 0 10px 10px',
                        borderTop: 'none',
                        py: 0.6,
                        width: '100%',
                        '&:hover': {
                          bgcolor: '#F0FAFB',
                          borderColor: '#028090',
                        },
                      }}
                    >
                      Smart Assign
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Smart Assign Modal */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        {/* Modal header */}
        <Box sx={{
          bgcolor: '#1A3C5E', px: 3, py: 2.5,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              bgcolor: '#028090', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AIIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
                Smart Assign
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }} noWrap>
                {selectedTaskTitle}
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={() => setAssignOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 0, p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
          {loadingRecs ? (
            <Box sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', py: 6, gap: 2,
            }}>
              <CircularProgress sx={{ color: '#028090' }} size={40} />
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Analysing team workload and skills...
              </Typography>
            </Box>
          ) : recommendations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <PersonIcon sx={{ fontSize: 48, color: '#E2E8F0', mb: 1 }} />
              <Typography sx={{ color: '#94A3B8' }}>
                No team members found
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {recommendations.map((rec, index) => {
                const isBest = index === 0;
                return (
                  <Paper
                    key={rec.user.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      border: isBest
                        ? '2px solid #028090'
                        : '1px solid #EEF2F6',
                      borderRadius: 2.5,
                      bgcolor: isBest ? '#F0FAFB' : 'white',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Best match ribbon */}
                    {isBest && (
                      <Box sx={{
                        position: 'absolute', top: 12, right: -8,
                        bgcolor: '#028090', color: 'white',
                        fontSize: 10, fontWeight: 700,
                        px: 1.5, py: 0.3,
                        borderRadius: '4px 0 0 4px',
                        display: 'flex', alignItems: 'center', gap: 0.5,
                      }}>
                        <CheckIcon sx={{ fontSize: 11 }} />
                        BEST MATCH
                      </Box>
                    )}

                    {/* User info row */}
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5, mb: 2,
                    }}>
                      <Avatar sx={{
                        width: 42, height: 42,
                        bgcolor: isBest ? '#028090' : '#E2E8F0',
                        color: isBest ? 'white' : '#64748B',
                        fontWeight: 700, fontSize: 14,
                      }}>
                        {rec.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{
                          fontWeight: 700, fontSize: 15,
                          color: '#1A3C5E',
                        }}>
                          {rec.user.name}
                        </Typography>
                        <Typography variant="caption" sx={{
                          color: '#94A3B8',
                          textTransform: 'capitalize',
                        }}>
                          {rec.user.role.replace('_', ' ')} •{' '}
                          {rec.active_tasks} active task{rec.active_tasks !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      {/* Score badge */}
                      <Box sx={{
                        textAlign: 'center',
                        bgcolor: isBest ? '#028090' : '#F1F5F9',
                        borderRadius: 2, px: 1.5, py: 0.8,
                        minWidth: 52,
                      }}>
                        <Typography sx={{
                          fontSize: 20, fontWeight: 800,
                          color: isBest ? 'white' : getScoreColor(rec.scores.final),
                          lineHeight: 1,
                        }}>
                          {rec.scores.final}
                        </Typography>
                        <Typography sx={{
                          fontSize: 9,
                          color: isBest ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                        }}>
                          SCORE
                        </Typography>
                      </Box>
                    </Box>

                    {/* Score bars */}
                    <Box sx={{
                      display: 'flex', flexDirection: 'column',
                      gap: 1, mb: 2,
                    }}>
                      {[
                        { label: 'Skill Match', value: rec.scores.skill_match },
                        { label: 'Workload', value: rec.scores.workload },
                      ].map((s) => (
                        <Box key={s.label} sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                        }}>
                          <Typography sx={{
                            fontSize: 11, color: '#64748B',
                            width: 80, flexShrink: 0, fontWeight: 500,
                          }}>
                            {s.label}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={s.value}
                              sx={{
                                height: 6, borderRadius: 3,
                                bgcolor: '#EEF2F6',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getScoreColor(s.value),
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                          <Typography sx={{
                            fontSize: 11, fontWeight: 700,
                            color: getScoreColor(s.value),
                            width: 36, textAlign: 'right',
                          }}>
                            {s.value}%
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Skills row */}
                    {(rec.matching_skills.length > 0 || rec.missing_skills.length > 0) && (
                      <Box sx={{
                        display: 'flex', gap: 0.7,
                        flexWrap: 'wrap', mb: 2,
                      }}>
                        {rec.matching_skills.map(skill => (
                          <Chip
                            key={skill} label={`✓ ${skill}`} size="small"
                            sx={{
                              bgcolor: '#E8F5E9', color: '#2e7d32',
                              fontSize: 10, height: 20, fontWeight: 600,
                            }}
                          />
                        ))}
                        {rec.missing_skills.map(skill => (
                          <Chip
                            key={skill} label={`✗ ${skill}`} size="small"
                            sx={{
                              bgcolor: '#FEECEC', color: '#c62828',
                              fontSize: 10, height: 20, fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Assign button */}
                    <Button
                      fullWidth
                      variant={isBest ? 'contained' : 'outlined'}
                      disabled={assigningId === rec.user.id}
                      onClick={() => handleAssign(rec.user.id, rec.user.name, isBest)}
                      sx={{
                        py: 1,
                        bgcolor: isBest ? '#028090' : 'transparent',
                        borderColor: '#028090',
                        color: isBest ? 'white' : '#028090',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: isBest ? '#025F6B' : '#F0FAFB',
                          borderColor: '#028090',
                        },
                      }}
                    >
                      {assigningId === rec.user.id
                        ? 'Assigning...'
                        : `Assign to ${rec.user.name.split(' ')[0]}`}
                    </Button>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TasksPage;