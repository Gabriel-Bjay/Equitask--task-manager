import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Paper, Skeleton,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, LinearProgress, Avatar,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import RAPIDCompliance from '../components/dashboard/RAPIDCompliance';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import api from '../services/api';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  department: string;
  total_tasks: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completion_rate: number;
}

interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  assigned: number;
  overdue: number;
  cancelled: number;
}

interface OverviewData {
  task_stats: TaskStats;
  by_category: { category: string; count: number }[];
  by_priority: { priority: string; count: number }[];
  team_workload: TeamMember[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#4caf50',
  in_progress: '#028090',
  assigned: '#1976d2',
  pending: '#9e9e9e',
  overdue: '#f44336',
  cancelled: '#757575',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#9c27b0',
  high: '#f44336',
  medium: '#ff9800',
  low: '#4caf50',
};

const SummaryCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Paper sx={{ p: 2.5, height: '100%', position: 'relative', overflow: 'hidden' }}>
    <Box sx={{ height: 4, bgcolor: color, width: '100%', position: 'absolute', top: 0, left: 0 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 0.5 }}>
      <Box>
        <Typography sx={{
          color: '#64748B', fontSize: 11, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5,
        }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 30, fontWeight: 700, color: '#1A3C5E', lineHeight: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{
        bgcolor: color, borderRadius: '12px', p: 1.2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
    </Box>
  </Paper>
);

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/analytics/dashboard/team_overview/');
        setData(res.data);
      } catch {
        console.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const completionRate = data
    ? Math.round(
        (data.task_stats.completed / (data.task_stats.total || 1)) * 100
      )
    : 0;

  const statusPieData = data
    ? Object.entries(data.task_stats)
        .filter(([key]) => key !== 'total' && key !== 'cancelled')
        .map(([key, value]) => ({
          name: key.replace('_', ' '),
          value: value as number,
          color: STATUS_COLORS[key],
        }))
        .filter((item) => item.value > 0)
    : [];

  const categoryBarData = data
    ? data.by_category.map((item) => ({
        name: item.category,
        tasks: item.count,
      }))
    : [];

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
          Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5, mb: 4 }}>
          Real-time performance metrics and team insights
        </Typography>

        {/* Summary stats */}
        {loading ? (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total Tasks"
                value={data?.task_stats.total || 0}
                icon={<TaskIcon sx={{ color: 'white', fontSize: 20 }} />}
                color="#1A3C5E"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Completion Rate"
                value={`${completionRate}%`}
                icon={<CheckIcon sx={{ color: 'white', fontSize: 20 }} />}
                color="#4caf50"
                subtitle={data ? `${data.task_stats.completed} completed` : '0 completed'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Team Members"
                value={data?.team_workload.length || 0}
                icon={<GroupIcon sx={{ color: 'white', fontSize: 20 }} />}
                color="#028090"
                subtitle="Active members"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Overdue Tasks"
                value={data?.task_stats.overdue || 0}
                icon={<WarningIcon sx={{ color: 'white', fontSize: 20 }} />}
                color="#f44336"
                subtitle="Needs attention"
              />
            </Grid>
          </Grid>
        )}

        {/* Charts row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Task status pie */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1A3C5E', mb: 0.5 }}>
                Task Status
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Distribution by current status
              </Typography>
              {loading ? (
                <Skeleton variant="circular" width={180} height={180} sx={{ mx: 'auto', mt: 3 }} />
              ) : statusPieData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    No tasks yet
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10, fontSize: 12,
                          border: '1px solid #EEF2F6',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {statusPieData.map((item) => (
                      <Box
                        key={item.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Box sx={{
                          width: 8, height: 8,
                          borderRadius: '50%', bgcolor: item.color,
                        }} />
                        <Typography sx={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>
                          {item.name} ({item.value})
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Tasks by category */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1A3C5E', mb: 0.5 }}>
                Tasks by Category
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Volume of work per category
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
              ) : categoryBarData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    No tasks yet
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ mt: 2, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={25}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10, fontSize: 12,
                          border: '1px solid #EEF2F6',
                        }}
                        cursor={{ fill: '#F8FAFC' }}
                      />
                      <Bar dataKey="tasks" fill="#028090" radius={[6, 6, 0, 0]} name="Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Team workload table */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1A3C5E', mb: 0.5 }}>
            Team Workload
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 2 }}>
            Task distribution and completion rates across team members
          </Typography>

          {loading ? (
            <Skeleton variant="rounded" height={200} />
          ) : data?.team_workload.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                No team members found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: '#64748B', fontSize: 12, border: 'none', bgcolor: '#F8FAFC' } }}>
                    <TableCell>Member</TableCell>
                    <TableCell align="center">Total</TableCell>
                    <TableCell align="center">In Progress</TableCell>
                    <TableCell align="center">Completed</TableCell>
                    <TableCell align="center">Overdue</TableCell>
                    <TableCell>Completion Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.team_workload.map((member) => (
                    <TableRow
                      key={member.id}
                      sx={{
                        '& td': { border: 'none', borderBottom: '1px solid #F1F5F9' },
                        '&:hover': { bgcolor: '#F8FAFC' },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 32, height: 32,
                            bgcolor: '#028090', fontSize: 12, fontWeight: 700,
                          }}>
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1A3C5E' }}>
                              {member.name}
                            </Typography>
                            <Typography variant="caption" sx={{
                              color: '#94A3B8', textTransform: 'capitalize',
                            }}>
                              {member.role.replace('_', ' ')}
                              {member.department ? ` · ${member.department}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 700, color: '#1A3C5E' }}>
                          {member.total_tasks}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={member.in_progress}
                          size="small"
                          sx={{
                            bgcolor: '#E8F4F6', color: '#028090',
                            fontWeight: 700, fontSize: 11, height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={member.completed}
                          size="small"
                          sx={{
                            bgcolor: '#E8F5E9', color: '#2e7d32',
                            fontWeight: 700, fontSize: 11, height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={member.overdue}
                          size="small"
                          sx={{
                            bgcolor: member.overdue > 0 ? '#FEECEC' : '#F1F5F9',
                            color: member.overdue > 0 ? '#c62828' : '#94A3B8',
                            fontWeight: 700, fontSize: 11, height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={member.completion_rate}
                            sx={{
                              flex: 1, height: 6, borderRadius: 3,
                              bgcolor: '#EEF2F6',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: member.completion_rate >= 70
                                  ? '#4caf50'
                                  : member.completion_rate >= 40
                                  ? '#ff9800'
                                  : '#f44336',
                                borderRadius: 3,
                              },
                            }}
                          />
                          <Typography sx={{
                            fontSize: 11, fontWeight: 700,
                            color: '#64748B', width: 32, textAlign: 'right',
                          }}>
                            {member.completion_rate}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Bottom row — RAPID + Workload */}
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

export default AnalyticsPage;