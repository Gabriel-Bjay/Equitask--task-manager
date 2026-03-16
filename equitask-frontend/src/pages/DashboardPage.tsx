import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid, Paper, Typography, Box, Skeleton, Chip,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Warning as OverdueIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import StatsCard from '../components/dashboard/StatsCard';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import RAPIDCompliance from '../components/dashboard/RAPIDCompliance';
import { fetchMyTasks } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  completed: '#4caf50',
  overdue: '#f44336',
  in_progress: '#ff9800',
  assigned: '#1976d2',
  pending: '#9e9e9e',
};

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { tasks, loading } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    dispatch(fetchMyTasks());
  }, [dispatch]);

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length,
    overdue: tasks.filter((t) => t.status === 'overdue').length,
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
            {greeting()}, {user?.first_name || 'there'} 👋
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
            Here's what's happening with your tasks today.
          </Typography>
        </Box>

        {/* Stats cards */}
        {loading ? (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Tasks"
                value={stats.total}
                icon={<TaskIcon sx={{ color: 'white', fontSize: 22 }} />}
                color="#1A3C5E"
                subtitle="All assigned tasks"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Completed"
                value={stats.completed}
                icon={<CompletedIcon sx={{ color: 'white', fontSize: 22 }} />}
                color="#4caf50"
                subtitle={`${completionRate}% completion rate`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="In Progress"
                value={stats.pending}
                icon={<PendingIcon sx={{ color: 'white', fontSize: 22 }} />}
                color="#028090"
                subtitle="Active tasks"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Overdue"
                value={stats.overdue}
                icon={<OverdueIcon sx={{ color: 'white', fontSize: 22 }} />}
                color="#f44336"
                subtitle="Needs attention"
              />
            </Grid>
          </Grid>
        )}

        {/* Progress bar */}
        {stats.total > 0 && (
          <Box sx={{
            mb: 4, p: 2.5, bgcolor: 'white',
            borderRadius: 3, border: '1px solid #EEF2F6',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingIcon sx={{ color: '#028090', fontSize: 18 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1A3C5E' }}>
                  Overall Progress
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#028090' }}>
                {completionRate}%
              </Typography>
            </Box>
            <Box sx={{
              height: 8, bgcolor: '#EEF2F6',
              borderRadius: 4, overflow: 'hidden',
            }}>
              <Box sx={{
                height: '100%',
                width: `${completionRate}%`,
                bgcolor: '#028090',
                borderRadius: 4,
                transition: 'width 0.8s ease',
              }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: 'Completed', count: stats.completed, color: '#4caf50' },
                { label: 'In Progress', count: stats.pending, color: '#028090' },
                { label: 'Overdue', count: stats.overdue, color: '#f44336' },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{
                    width: 8, height: 8,
                    borderRadius: '50%', bgcolor: item.color,
                  }} />
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    {item.label}: {item.count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Recent Tasks — full width compact list */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', mb: 2,
          }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E' }}>
              Recent Tasks
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#028090', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/my-tasks')}
            >
              View all →
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i} variant="rounded"
                  height={72} sx={{ flex: 1, borderRadius: 2 }}
                />
              ))}
            </Box>
          ) : tasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                No tasks assigned yet
              </Typography>
            </Box>
          ) : (
            // Horizontal scrolling row of task cards
            <Box sx={{
              display: 'flex', gap: 2,
              overflowX: 'auto', pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-track': { bgcolor: '#F5F7FA', borderRadius: 2 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 },
            }}>
              {tasks.slice(0, 6).map((task) => (
                <Box
                  key={task.id}
                  onClick={() => navigate('/my-tasks')}
                  sx={{
                    minWidth: 200,
                    maxWidth: 220,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #EEF2F6',
                    borderTop: `3px solid ${statusColors[task.status] || '#9e9e9e'}`,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: '#F8FAFC',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Typography sx={{
                    fontSize: 13, fontWeight: 600,
                    color: '#1A3C5E', mb: 0.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {task.title}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#94A3B8', textTransform: 'capitalize',
                    display: 'block', mb: 1,
                  }}>
                    {task.category}
                  </Typography>
                  <Chip
                    label={task.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: statusColors[task.status] || '#9e9e9e',
                      color: 'white', fontWeight: 600,
                      fontSize: 10, height: 20,
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Bottom row — RAPID (left) + Workload chart (right) */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <RAPIDCompliance />
          </Grid>
          <Grid item xs={12} md={7}>
            <WorkloadChart />
          </Grid>
        </Grid>

      </Box>
    </Layout>
  );
};

export default DashboardPage;