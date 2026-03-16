import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { Task } from '../../types/task.types';
import { format } from 'date-fns';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';

interface TaskDetailsProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ task, open, onClose }) => {
  if (!task) return null;

  const statusColor = TASK_STATUSES.find((s) => s.value === task.status)?.color;
  const priorityColor = TASK_PRIORITIES.find((p) => p.value === task.priority)?.color;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">{task.title}</Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={task.status.replace('_', ' ').toUpperCase()}
            sx={{ backgroundColor: statusColor, color: 'white' }}
          />
          <Chip
            label={task.priority.toUpperCase()}
            sx={{ backgroundColor: priorityColor, color: 'white' }}
          />
          <Chip label={task.category} variant="outlined" />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Description
        </Typography>
        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
          {task.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Deadline
                </Typography>
                <Typography variant="body2">
                  {task.deadline ? format(new Date(task.deadline), 'PPP p') : 'No deadline'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CategoryIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Estimated Hours
                </Typography>
                <Typography variant="body2">{task.estimated_hours || 'Not specified'}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">
              Complexity Score
            </Typography>
            <Typography variant="body2">{task.complexity_score}/10</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">
              Created
            </Typography>
            <Typography variant="body2">
              {format(new Date(task.created_at), 'PPP')}
            </Typography>
          </Grid>
        </Grid>

        {task.required_skills && task.required_skills.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Required Skills
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {task.required_skills.map((skill) => (
                <Chip key={skill} label={skill} color="primary" variant="outlined" />
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetails;