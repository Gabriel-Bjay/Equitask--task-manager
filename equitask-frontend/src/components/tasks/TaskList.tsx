import React, { useState } from 'react';
import {
  Box, TextField, MenuItem, Grid,
  Typography, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Assignment as TaskIcon } from '@mui/icons-material';
import TaskCard from './TaskCard';
import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } from '../../utils/constants';

interface TaskListProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onView?: (task: Task) => void;
  onCreateNew?: () => void;
  onStatusChange?: () => void;
  showFilters?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks, onEdit, onDelete, onView,
  onStatusChange, showFilters = true,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  return (
    <Box>
      {showFilters && (
        <Box sx={{
          mb: 3, p: 2.5, bgcolor: 'white',
          borderRadius: 3, border: '1px solid #EEF2F6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                select fullWidth size="small" label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {TASK_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                select fullWidth size="small" label="Priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                {TASK_PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                select fullWidth size="small" label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {TASK_CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Showing {filteredTasks.length} of {tasks.length} tasks
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: '#028090', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {filteredTasks.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: '#EEF2F6', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <TaskIcon sx={{ fontSize: 36, color: '#94A3B8' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1A3C5E', fontWeight: 600 }}>
            {tasks.length === 0 ? 'No tasks yet' : 'No results found'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 280 }}>
            {tasks.length === 0
              ? 'Tasks created by your manager will appear here'
              : 'Try adjusting your search or filters'}
          </Typography>
        </Box>
      ) : (
        <Box>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onStatusChange={onStatusChange}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TaskList;