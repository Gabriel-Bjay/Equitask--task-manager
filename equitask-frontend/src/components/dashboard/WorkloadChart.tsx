import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, isToday, parseISO } from 'date-fns';
import api from '../../services/api';
import { useThemeContext } from '../../context/ThemeContext';

interface WorkloadChartProps {
  scope: 'team' | 'mine';
}

interface DayLoad {
  date: string;
  hours: number;
  tasks: number;
}

const SUBTITLES = {
  team: 'Estimated hours of open team work due each day',
  mine: 'Estimated hours of your open work due each day',
};

const WorkloadChart: React.FC<WorkloadChartProps> = ({ scope }) => {
  const { accentColor } = useThemeContext();
  const [days, setDays] = useState<DayLoad[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setFailed(false);
    api.get('/analytics/dashboard/upcoming_workload/', {
      params: scope === 'mine' ? { scope } : undefined,
    })
      .then((res) => { if (!cancelled) setDays(res.data.days); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [scope]);

  const chartData = (days || []).map((day) => {
    const date = parseISO(day.date);
    return {
      name: isToday(date) ? 'Today' : format(date, 'EEE'),
      hours: day.hours,
      tasks: day.tasks,
    };
  });
  const hasWork = chartData.some((day) => day.tasks > 0);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E' }}>
          Upcoming Workload
        </Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
          {SUBTITLES[scope]} — next 7 days
        </Typography>
      </Box>
      <Box sx={{ width: '100%', height: 260 }}>
        {failed ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Couldn't load workload data
            </Typography>
          </Box>
        ) : days === null ? (
          <Skeleton variant="rounded" height="100%" sx={{ borderRadius: 2 }} />
        ) : !hasWork ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Nothing due in the next 7 days
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #EEF2F6',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: 13,
                }}
                cursor={{ fill: '#F8FAFC' }}
                formatter={(value: any, _name: any, item: any) => [
                  `${value}h across ${item.payload.tasks} task${item.payload.tasks === 1 ? '' : 's'}`,
                  'Due',
                ]}
              />
              <Bar
                dataKey="hours"
                fill={accentColor}
                radius={[6, 6, 0, 0]}
                name="Hours"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};

export default WorkloadChart;
