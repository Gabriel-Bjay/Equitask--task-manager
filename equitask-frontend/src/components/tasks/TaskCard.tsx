import React from 'react';
import {
  Card, CardContent, Typography, Chip, Box,
  IconButton, Menu, MenuItem, Select, FormControl,
} from '@mui/material';
import { MoreVert as MoreIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { Task } from '../../types/task.types';
import { format } from 'date-fns';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useSelector, UseSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onView?: (task: Task) => void;
  onStatusChange?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task, onEdit, onDelete, onView, onStatusChange,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const isManager = user?.role === 'administrator' || user?.role === 'manager';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const statusColor = TASK_STATUSES.find((s) => s.value === task.status)?.color || '#9e9e9e';
  const priorityColor = TASK_PRIORITIES.find((p) => p.value === task.priority)?.color || '#9e9e9e';

  const borderColor =
    task.priority === 'critical' ? '#9c27b0' :
    task.priority === 'high' ? '#f44336' :
    task.priority === 'medium' ? '#ff9800' : '#4caf50';

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/tasks/${task.id}/`, { status: newStatus });
      toast.success(`Status updated to "${newStatus.replace('_', ' ')}"`);
      onStatusChange?.();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card sx={{
      mb: 2,
      position: 'relative',
      borderLeft: `4px solid ${borderColor}`,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      '&:hover': {
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        transform: 'translateY(-1px)',
      },
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, pr: 1 }}>

            {/* Title */}
            <Typography
              variant="h6"
              sx={{
                fontSize: 16, fontWeight: 600, color: '#1A3C5E',
                cursor: 'pointer',
                '&:hover': { color: '#028090' },
                transition: 'color 0.15s ease',
              }}
              onClick={() => onView?.(task)}
            >
              {task.title}
            </Typography>

            {/* Description */}
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.6 }}
            >
              {task.description.length > 120
                ? `${task.description.substring(0, 120)}...`
                : task.description}
            </Typography>

            {/* Chips */}
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={task.status.replace('_', ' ').toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: statusColor, color: 'white',
                  fontWeight: 600, fontSize: 10, height: 22,
                }}
              />
              <Chip
                label={task.priority.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: priorityColor, color: 'white',
                  fontWeight: 600, fontSize: 10, height: 22,
                }}
              />
              <Chip
                label={task.category}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 22, textTransform: 'capitalize' }}
              />
            </Box>
            {/* Status updater — managers and admins only */}
            {isManager && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                  Update status:
                </Typography>
                <FormControl size="small">
                  <Select
                    native
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    sx={{
                      fontSize: 12, borderRadius: '8px', height: 28,
                      color: '#1A3C5E',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </Select>
                </FormControl>
              </Box>
            )}
            {/* Deadline and hours */}
            <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {task.deadline && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon fontSize="small" sx={{ color: '#94A3B8', fontSize: 14 }} />
                  <Typography variant="caption" color="textSecondary">
                    Due {format(new Date(task.deadline), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
              {task.estimated_hours && (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  ~{task.estimated_hours}h estimated
                </Typography>
              )}
            </Box>

            {/* Skills */}
            {task.required_skills && task.required_skills.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {task.required_skills.map((skill, idx) => (
                  <Chip
                    key={idx} label={skill} size="small" variant="outlined"
                    sx={{ fontSize: 10, height: 20, color: '#028090', borderColor: '#028090' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Menu button */}
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{ color: '#94A3B8', '&:hover': { color: '#1A3C5E' } }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{ elevation: 2, sx: { borderRadius: 2, minWidth: 150 } }}
        >
          <MenuItem onClick={() => { onView?.(task); handleMenuClose(); }} sx={{ fontSize: 14 }}>
            View Details
          </MenuItem>
          <MenuItem onClick={() => { onEdit?.(task); handleMenuClose(); }} sx={{ fontSize: 14 }}>
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => { onDelete?.(task.id); handleMenuClose(); }}
            sx={{ fontSize: 14, color: 'error.main' }}
          >
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default TaskCard;