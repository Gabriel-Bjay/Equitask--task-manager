import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Paper, Typography, Box } from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import StatsCard from '../components/dashboard/StatsCard';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import RAPIDCompliance from '../components/dashboard/RAPIDCompliance';
import { fetchMyTasks } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { tasks } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    dispatch(fetchMyTasks());
  }, [dispatch]);

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length,
    overdue: tasks.filter((t) => t.status === 'overdue').length,
  };

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Here's what's happening with your tasks today.
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Tasks"
              value={stats.total}
              icon={<TaskIcon sx={{ color: 'white' }} />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Completed"
              value={stats.completed}
              icon={<CompletedIcon sx={{ color: 'white' }} />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending"
              value={stats.pending}
              icon={<PendingIcon sx={{ color: 'white' }} />}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Overdue"
              value={stats.overdue}
              icon={<OverdueIcon sx={{ color: 'white' }} />}
              color="#f44336"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Tasks
              </Typography>
              {tasks.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                  No tasks assigned yet
                </Typography>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderLeft: `4px solid ${
                        task.status === 'completed'
                          ? '#4caf50'
                          : task.status === 'overdue'
                          ? '#f44336'
                          : '#1976d2'
                      }`,
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#f0f0f0',
                      },
                    }}
                    onClick={() => navigate('/my-tasks')}
                  >
                    <Typography variant="subtitle1">{task.title}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {task.status} • Priority: {task.priority}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <RAPIDCompliance />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default DashboardPage;