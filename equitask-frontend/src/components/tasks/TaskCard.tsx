import React from 'react';
import {
  Card, CardContent, Typography, Chip, Box, Button,
  IconButton, Menu, MenuItem, Select, FormControl,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  PlayArrow as StartIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import { Task, TaskStatus } from '../../types/task.types';
import { format } from 'date-fns';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../utils/constants';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { apiErrorMessage } from '../../utils/apiError';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onView?: (task: Task) => void;
  onStatusChange?: () => void;
  // The viewer is the task's assignee and may start or complete it.
  canProgress?: boolean;
}

const statusLabel = (status: string) =>
  TASK_STATUSES.find((s) => s.value === status)?.label || status;

const TaskCard: React.FC<TaskCardProps> = ({
  task, onEdit, onDelete, onView, onStatusChange, canProgress = false,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [updating, setUpdating] = React.useState(false);
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

  const estimatedHours = task.estimated_hours != null ? Number(task.estimated_hours) : 0;

  const canStart = canProgress && !isManager && ['assigned', 'overdue'].includes(task.status);
  const canComplete =
    canProgress && !isManager && ['assigned', 'in_progress', 'overdue'].includes(task.status);

  const menuItems = [
    onView && { label: 'View details', action: () => onView(task) },
    onEdit && { label: 'Edit', action: () => onEdit(task) },
    onDelete && { label: 'Delete', action: () => onDelete(task.id), danger: true },
  ].filter(Boolean) as { label: string; action: () => void; danger?: boolean }[];

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/tasks/${task.id}/`, { status: newStatus });
      toast.success(`Status updated to "${statusLabel(newStatus)}"`);
      onStatusChange?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to update status'));
    } finally {
      setUpdating(false);
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
          <Box sx={{ flex: 1, pr: 1, minWidth: 0 }}>

            {/* Title */}
            <Typography
              variant="h6"
              sx={{
                fontSize: 16, fontWeight: 600, color: '#1A3C5E',
                overflowWrap: 'anywhere',
                ...(onView && {
                  cursor: 'pointer',
                  '&:hover': { color: 'var(--accent)' },
                  transition: 'color 0.15s ease',
                }),
              }}
              onClick={() => onView?.(task)}
            >
              {task.title}
            </Typography>

            {/* Description */}
            {task.description && (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.6 }}
              >
                {task.description.length > 120
                  ? `${task.description.substring(0, 120)}...`
                  : task.description}
              </Typography>
            )}

            {/* Chips */}
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={statusLabel(task.status).toUpperCase()}
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

            {/* Status updater — managers and admins */}
            {isManager && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                  Update status:
                </Typography>
                <FormControl size="small">
                  <Select
                    native
                    value={task.status}
                    disabled={updating}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    inputProps={{ 'aria-label': `Status of ${task.title}` }}
                    sx={{
                      fontSize: 12, borderRadius: '8px', height: 28,
                      color: '#1A3C5E',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
                    }}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Progress actions — the assignee */}
            {(canStart || canComplete) && (
              <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {canStart && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<StartIcon />}
                    disabled={updating}
                    onClick={() => handleStatusChange('in_progress')}
                    sx={{ borderColor: 'var(--accent)', color: 'var(--accent)', textTransform: 'none' }}
                  >
                    Start
                  </Button>
                )}
                {canComplete && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DoneIcon />}
                    disabled={updating}
                    onClick={() => handleStatusChange('completed')}
                    sx={{
                      bgcolor: 'var(--accent)', textTransform: 'none',
                      '&:hover': { bgcolor: 'var(--accent-dark)' },
                    }}
                  >
                    Mark complete
                  </Button>
                )}
              </Box>
            )}

            {/* Assignee, deadline and hours */}
            <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {task.assignee !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ color: '#94A3B8', fontSize: 14 }} />
                  <Typography variant="caption" color="textSecondary">
                    {task.assignee ? task.assignee.name : 'Unassigned'}
                  </Typography>
                </Box>
              )}
              {task.deadline && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon fontSize="small" sx={{ color: '#94A3B8', fontSize: 14 }} />
                  <Typography variant="caption" color="textSecondary">
                    Due {format(new Date(task.deadline), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
              {estimatedHours > 0 && (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  ~{estimatedHours}h estimated
                </Typography>
              )}
            </Box>

            {/* Skills */}
            {task.required_skills && task.required_skills.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {task.required_skills.map((skill, idx) => (
                  <Chip
                    key={idx} label={skill} size="small" variant="outlined"
                    sx={{ fontSize: 10, height: 20, color: 'var(--accent)', borderColor: 'var(--accent)' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Menu button */}
          {menuItems.length > 0 && (
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-label={`Actions for ${task.title}`}
              sx={{ color: '#94A3B8', '&:hover': { color: '#1A3C5E' } }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{ elevation: 2, sx: { borderRadius: 2, minWidth: 150 } }}
        >
          {menuItems.map((item) => (
            <MenuItem
              key={item.label}
              onClick={() => { item.action(); handleMenuClose(); }}
              sx={{ fontSize: 14, ...(item.danger && { color: 'error.main' }) }}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
