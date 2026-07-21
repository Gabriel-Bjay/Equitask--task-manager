import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import api from '../../services/api';

type FairnessScope = 'all' | 'active';

interface FairnessMember {
  id: number;
  name: string;
  role: string;
  task_count: number;
  workload_hours: number;
  band: string;
}

interface FairnessDistribution {
  members_counted: number;
  members_with_work: number;
  mean_hours: number;
  variance: number;
  std_dev: number;
  coefficient_of_variation: number;
  gini_coefficient: number;
  min_hours: number;
  max_hours: number;
}

interface FairnessData {
  scope: string;
  metric: string;
  default_task_hours: number;
  members: FairnessMember[];
  distribution: FairnessDistribution;
}

const BAND_COLORS: Record<string, string> = {
  underloaded: '#90a4ae',
  balanced: '#4caf50',
  high: '#ff9800',
  overloaded: '#f44336',
};

const BAND_LABELS: Record<string, string> = {
  underloaded: 'Underloaded (< 50% of mean)',
  balanced: 'Balanced (within \u00b150% of mean)',
  high: 'High (1.5\u20132\u00d7 mean)',
  overloaded: 'Overloaded (> 2\u00d7 mean)',
};

function giniInterpretation(gini: number): string {
  if (gini < 0.15) return 'Very even distribution';
  if (gini < 0.3) return 'Reasonably balanced';
  if (gini < 0.45) return 'Some concentration';
  return 'Heavily concentrated';
}

interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, caption }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
      {value}
    </Typography>
    {caption && (
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    )}
  </Paper>
);

const FairnessPanel: React.FC = () => {
  const [scope, setScope] = useState<FairnessScope>('all');
  const [data, setData] = useState<FairnessData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/analytics/dashboard/fairness/?scope=${scope}`,
        );
        if (active) {
          setData(response.data);
          setError(null);
        }
      } catch (err) {
        if (active) setError('Could not load fairness metrics.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [scope]);

  const handleScope = (
    _event: React.MouseEvent<HTMLElement>,
    next: FairnessScope | null,
  ) => {
    if (next) setScope(next);
  };

  const scopeToggle = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={scope}
      onChange={handleScope}
      sx={{ mb: 2 }}
    >
      <ToggleButton value="all">All-time</ToggleButton>
      <ToggleButton value="active">Active now</ToggleButton>
    </ToggleButtonGroup>
  );

  if (loading && !data) {
    return (
      <Box sx={{ mt: 4 }}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton
          variant="rectangular"
          height={280}
          sx={{ mt: 2, borderRadius: 1 }}
        />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Workload fairness
        </Typography>
        {scopeToggle}
        <Typography color="text.secondary">
          {error || 'No fairness data available.'}
        </Typography>
      </Box>
    );
  }

  const { distribution, members } = data;
  const chartData = members.map((member) => ({
    name: member.name,
    hours: member.workload_hours,
    band: member.band,
  }));

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Workload fairness
      </Typography>
      {scopeToggle}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {scope === 'all'
          ? `Cumulative workload (estimated hours) across every task the engine assigned. ${distribution.members_with_work} of ${distribution.members_counted} members received work.`
          : `Current open workload (estimated hours). ${distribution.members_with_work} of ${distribution.members_counted} members hold active work.`}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Gini coefficient"
            value={distribution.gini_coefficient.toFixed(3)}
            caption={giniInterpretation(distribution.gini_coefficient)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Std deviation"
            value={`${distribution.std_dev.toFixed(1)} h`}
            caption={`Variance ${distribution.variance.toFixed(1)}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Mean workload"
            value={`${distribution.mean_hours.toFixed(1)} h`}
            caption={`CV ${distribution.coefficient_of_variation.toFixed(2)}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Spread"
            value={`${distribution.min_hours.toFixed(0)}\u2013${distribution.max_hours.toFixed(0)} h`}
            caption="Min to max per member"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Workload by member
            </Typography>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  label={{
                    value: 'Hours',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  formatter={(value: any) => [`${value} h`, 'Workload']}
                />
                <ReferenceLine
                  y={distribution.mean_hours}
                  stroke="#37474f"
                  strokeDasharray="4 4"
                  label={{
                    value: `Mean ${distribution.mean_hours.toFixed(1)}h`,
                    position: 'right',
                    fontSize: 11,
                    fill: '#37474f',
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAND_COLORS[entry.band] || '#028090'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>
              Fairness bands
            </Typography>
            {Object.keys(BAND_LABELS).map((key) => (
              <Box
                key={key}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '3px',
                    backgroundColor: BAND_COLORS[key],
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2">{BAND_LABELS[key]}</Typography>
              </Box>
            ))}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Bars are colored by each member's distance from the team mean
                (dashed line). A fair distribution keeps most members in the
                balanced band. Tasks without an estimate count as{' '}
                {data.default_task_hours} h.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FairnessPanel;
