import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WorkloadChartProps {
  data?: { name: string; hours: number }[];
}

const WorkloadChart: React.FC<WorkloadChartProps> = ({ data }) => {
  const chartData = data || [
    { name: 'Mon', hours: 8 },
    { name: 'Tue', hours: 6 },
    { name: 'Wed', hours: 10 },
    { name: 'Thu', hours: 7 },
    { name: 'Fri', hours: 9 },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E' }}>
          Weekly Workload
        </Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
          Estimated hours per day this week
        </Typography>
      </Box>
      <Box sx={{ width: '100%', height: 260 }}>
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
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #EEF2F6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
              cursor={{ fill: '#F8FAFC' }}
            />
            <Bar
              dataKey="hours"
              fill="#028090"
              radius={[6, 6, 0, 0]}
              name="Hours"
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default WorkloadChart;