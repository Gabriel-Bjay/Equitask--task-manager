import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, subtitle }) => {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Color accent bar at top */}
      <Box sx={{ height: 4, bgcolor: color, width: '100%' }} />
      <CardContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              sx={{ color: '#64748B', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 700, color: '#1A3C5E', lineHeight: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{
            bgcolor: color,
            borderRadius: '12px',
            p: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.9,
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;