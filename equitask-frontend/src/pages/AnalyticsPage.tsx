import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import Layout from '../components/layout/Layout';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import RAPIDCompliance from '../components/dashboard/RAPIDCompliance';

const AnalyticsPage: React.FC = () => {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Performance metrics and system insights
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <WorkloadChart />
          </Grid>
          <Grid item xs={12} md={4}>
            <RAPIDCompliance />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default AnalyticsPage;