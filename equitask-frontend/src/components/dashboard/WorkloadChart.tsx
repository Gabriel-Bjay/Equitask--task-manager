import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface WorkloadChartProps {
  data?: any[];
}

const WorkloadChart: React.FC<WorkloadChartProps> = ({ data }) => {
  // Sample data if none provided
  const chartData = data || [
    { name: 'Mon', hours: 8 },
    { name: 'Tue', hours: 6 },
    { name: 'Wed', hours: 10 },
    { name: 'Thu', hours: 7 },
    { name: 'Fri', hours: 9 },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Weekly Workload
      </Typography>
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hours" fill="#1976d2" name="Hours" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default WorkloadChart;