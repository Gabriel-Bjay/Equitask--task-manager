import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Task } from '../../types/task.types';
import { format } from 'date-fns';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onView?: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onView }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const statusColor = TASK_STATUSES.find((s) => s.value === task.status)?.color || '#gray';
  const priorityColor = TASK_PRIORITIES.find((p) => p.value === task.priority)?.color || '#gray';

  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={() => onView?.(task)}
            >
              {task.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {task.description.length > 150
                ? `${task.description.substring(0, 150)}...`
                : task.description}
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={task.status.replace('_', ' ').toUpperCase()}
                size="small"
                sx={{ backgroundColor: statusColor, color: 'white' }}
              />
              <Chip
                label={task.priority.toUpperCase()}
                size="small"
                sx={{ backgroundColor: priorityColor, color: 'white' }}
              />
              <Chip label={task.category} size="small" variant="outlined" />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              {task.deadline && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="textSecondary">
                    {format(new Date(task.deadline), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
              {task.estimated_hours && (
                <Typography variant="caption" color="textSecondary">
                  ~{task.estimated_hours}h
                </Typography>
              )}
            </Box>

            {task.required_skills && task.required_skills.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {task.required_skills.map((skill, idx) => (
                  <Chip key={idx} label={skill} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </Box>

          <IconButton onClick={handleMenuOpen}>
            <MoreIcon />
          </IconButton>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              onView?.(task);
              handleMenuClose();
            }}
          >
            View Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              onEdit?.(task);
              handleMenuClose();
            }}
          >
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              onDelete?.(task.id);
              handleMenuClose();
            }}
          >
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default TaskCard;