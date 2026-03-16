import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { RAPID_PRINCIPLES } from '../../utils/constants';

interface RAPIDComplianceProps {
  scores?: {
    responsibility?: number;
    accountability?: number;
    professionalism?: number;
    inclusivity?: number;
    diversity?: number;
  };
}

const RAPIDCompliance: React.FC<RAPIDComplianceProps> = ({ scores }) => {
  const defaultScores = {
    responsibility: 95,
    accountability: 98,
    professionalism: 92,
    inclusivity: 78,
    diversity: 85,
  };

  const displayScores = scores || defaultScores;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        RAPID Compliance Scores
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        System adherence to ethical principles
      </Typography>

      <Box sx={{ mt: 2 }}>
        {RAPID_PRINCIPLES.map((principle) => {
          const score = displayScores[principle.key as keyof typeof displayScores] || 0;
          return (
            <Box key={principle.key} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{principle.label}</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {score}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={score}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: principle.color,
                  },
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'primary.light',
          borderRadius: 1,
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" color="primary.main">
          {Math.round(
            Object.values(displayScores).reduce((a, b) => a + b, 0) /
              Object.values(displayScores).length
          )}
          %
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Overall RAPID Compliance
        </Typography>
      </Box>
    </Paper>
  );
};

export default RAPIDCompliance;