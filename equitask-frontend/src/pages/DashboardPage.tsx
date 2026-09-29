import React, { useEffect, useState } from 'react';
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
import { fetchMyTasks, fetchTasks } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { TASK_STATUSES } from '../utils/constants';

const statusColors: Record<string, string> = {
  completed: '#4caf50',
  overdue: '#f44336',
  in_progress: '#ff9800',
  assigned: '#1976d2',
  pending: '#9e9e9e',
  cancelled: '#757575',
};

interface Stats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
}

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { tasks: teamTasks, myTasks, loading } = useSelector((state: RootState) => state.tasks);
  const isManager = user?.role === 'administrator' || user?.role === 'manager';
  const [teamStats, setTeamStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isManager) {
      dispatch(fetchMyTasks());
      return;
    }
    dispatch(fetchTasks({ page: 1 }));
    let cancelled = false;
    api.get('/analytics/dashboard/team_overview/')
      .then((res) => {
        if (cancelled) return;
        const s = res.data.task_stats;
        setTeamStats({
          total: s.total,
          completed: s.completed,
          active: s.assigned + s.in_progress,
          overdue: s.overdue,
        });
      })
      .catch(() => { if (!cancelled) setTeamStats({ total: 0, completed: 0, active: 0, overdue: 0 }); });
    return () => { cancelled = true; };
  }, [dispatch, isManager]);

  const recentTasks = isManager ? teamTasks : myTasks;
  const stats: Stats | null = isManager ? teamStats : loading ? null : {
    total: myTasks.length,
    completed: myTasks.filter((t) => t.status === 'completed').length,
    active: myTasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length,
    overdue: myTasks.filter((t) => t.status === 'overdue').length,
  };

  // Floor so "100%" only ever means everything is done.
  const completionRate = stats && stats.total > 0
    ? Math.floor((stats.completed / stats.total) * 100)
    : 0;

  const tasksRoute = isManager ? '/tasks' : '/my-tasks';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const cards = stats ? [
    {
      title: 'Total Tasks', value: stats.total, color: '#1A3C5E',
      icon: <TaskIcon sx={{ color: 'white', fontSize: 22 }} />,
      subtitle: isManager ? 'Across the team' : 'Assigned to you',
    },
    {
      title: 'Completed', value: stats.completed, color: '#4caf50',
      icon: <CompletedIcon sx={{ color: 'white', fontSize: 22 }} />,
      subtitle: `${completionRate}% completion rate`,
    },
    {
      title: 'In Progress', value: stats.active, color: '#028090',
      icon: <PendingIcon sx={{ color: 'white', fontSize: 22 }} />,
      subtitle: 'Assigned or being worked on',
    },
    {
      title: 'Overdue', value: stats.overdue, color: '#f44336',
      icon: <OverdueIcon sx={{ color: 'white', fontSize: 22 }} />,
      subtitle: 'Needs attention',
    },
  ] : [];

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
            {greeting()}, {user?.first_name || 'there'} 👋
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
            {isManager
              ? "Here's what's happening across your team today."
              : "Here's what's happening with your tasks today."}
          </Typography>
        </Box>

        {/* Stats cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats === null
            ? [1, 2, 3, 4].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3 }} />
              </Grid>
            ))
            : cards.map((card) => (
              <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <StatsCard {...card} />
              </Grid>
            ))}
        </Grid>

        {/* Progress bar */}
        {stats && stats.total > 0 && (
          <Box sx={{
            mb: 4, p: 2.5, bgcolor: 'white',
            borderRadius: 3, border: '1px solid #EEF2F6',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingIcon sx={{ color: 'var(--accent)', fontSize: 18 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1A3C5E' }}>
                  Overall Progress
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
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
                bgcolor: 'var(--accent)',
                borderRadius: 4,
                transition: 'width 0.8s ease',
              }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: 'Completed', count: stats.completed, color: '#4caf50' },
                { label: 'In Progress', count: stats.active, color: '#028090' },
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

        {/* Recent tasks — compact horizontal list */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', mb: 2,
          }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E' }}>
              {isManager ? 'Recent Team Tasks' : 'Recent Tasks'}
            </Typography>
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={() => navigate(tasksRoute)}
              sx={{
                background: 'none', border: 0, p: 0,
                color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
              }}
            >
              View all →
            </Typography>
          </Box>

          {loading && recentTasks.length === 0 ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i} variant="rounded"
                  height={72} sx={{ flex: 1, borderRadius: 2 }}
                />
              ))}
            </Box>
          ) : recentTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                {isManager ? 'No tasks created yet' : 'No tasks assigned yet'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'flex', gap: 2,
              overflowX: 'auto', pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-track': { bgcolor: '#F5F7FA', borderRadius: 2 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 },
            }}>
              {recentTasks.slice(0, 6).map((task) => (
                <Box
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(tasksRoute)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(tasksRoute); }}
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
                    {isManager && ` • ${task.assignee ? task.assignee.name : 'Unassigned'}`}
                  </Typography>
                  <Chip
                    label={TASK_STATUSES.find((s) => s.value === task.status)?.label || task.status}
                    size="small"
                    sx={{
                      bgcolor: statusColors[task.status] || '#9e9e9e',
                      color: 'white', fontWeight: 600,
                      fontSize: 10, height: 20,
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Bottom row — RAPID (left) + upcoming workload (right) */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <RAPIDCompliance />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <WorkloadChart scope={isManager ? 'team' : 'mine'} />
          </Grid>
        </Grid>

      </Box>
    </Layout>
  );
};

export default DashboardPage;
