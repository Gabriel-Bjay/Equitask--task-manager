import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography, Box, Button, TextField, Stack, MenuItem, Pagination,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  InputAdornment, LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AIIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import Layout from '../components/layout/Layout';
import TaskCard from '../components/tasks/TaskCard';
import TaskDetails from '../components/tasks/TaskDetails';
import SmartAssignDialog from '../components/tasks/SmartAssignDialog';
import { fetchTasks, createTask, updateTask, deleteTask } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { toast } from 'react-toastify';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types/task.types';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../utils/constants';

// Matches REST_FRAMEWORK['PAGE_SIZE'] on the backend.
const PAGE_SIZE = 20;

interface TaskForm {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimated_hours: string;
  complexity_score: string;
  deadline: string;
  required_skills: string;
}

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  category: 'development',
  priority: 'medium',
  estimated_hours: '8',
  complexity_score: '5',
  deadline: '',
  required_skills: '',
};

const toForm = (task: Task): TaskForm => ({
  title: task.title,
  description: task.description,
  category: task.category,
  priority: task.priority,
  estimated_hours: task.estimated_hours != null ? String(Number(task.estimated_hours)) : '',
  complexity_score: String(task.complexity_score),
  // datetime-local inputs take local time without a zone
  deadline: task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : '',
  required_skills: (task.required_skills || []).join(', '),
});

const TasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, totalCount, loading } = useSelector((state: RootState) => state.tasks);
  const { user } = useSelector((state: RootState) => state.auth);
  const isManager = user?.role === 'administrator' || user?.role === 'manager';

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TaskForm>(EMPTY_FORM);
  // What the form opened with, so closing can tell whether anything changed.
  const [formStart, setFormStart] = useState<TaskForm>(EMPTY_FORM);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [assigning, setAssigning] = useState<{ id: number; title: string } | null>(null);

  const loadTasks = useCallback(() => {
    dispatch(fetchTasks({
      page,
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
    }));
  }, [dispatch, page, search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Debounce search so typing does not send a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filtersActive = Boolean(search || statusFilter || priorityFilter || categoryFilter);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setPage(1);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormStart(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setFormData(toForm(task));
    setFormStart(toForm(task));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setConfirmingDiscard(false);
  };

  const formChanged = (Object.keys(formData) as (keyof TaskForm)[])
    .some((key) => formData[key] !== formStart[key]);

  // Cancel asks first when there are unsaved edits.
  const requestCloseForm = () => {
    if (formChanged) setConfirmingDiscard(true);
    else closeForm();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      estimated_hours: Number(formData.estimated_hours),
      complexity_score: Number(formData.complexity_score),
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      required_skills: formData.required_skills
        .split(',').map((s) => s.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      if (editingId) {
        await dispatch(updateTask({ id: editingId, data: payload })).unwrap();
        toast.success('Task updated');
      } else {
        await dispatch(createTask(payload)).unwrap();
        toast.success('Task created');
      }
      closeForm();
      loadTasks();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await dispatch(deleteTask(deleting.id)).unwrap();
      toast.success('Task deleted');
      setDeleting(null);
      if (tasks.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadTasks();
      }
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to delete task');
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap',
        }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1A3C5E' }}>
              All Tasks
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.3 }}>
              {totalCount} task{totalCount !== 1 ? 's' : ''}
              {filtersActive ? ' matching your filters' : ' total'}
            </Typography>
          </Box>
          {isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={showForm ? requestCloseForm : openCreate}
              sx={{ bgcolor: 'var(--accent)', '&:hover': { bgcolor: 'var(--accent-dark)' } }}
            >
              {showForm ? 'Cancel' : 'New Task'}
            </Button>
          )}
        </Box>

        {/* Create / edit form */}
        {showForm && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              mb: 4, p: 3, bgcolor: 'white',
              borderRadius: 3, border: '1px solid #EEF2F6',
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1A3C5E', mb: 2 }}>
              {editingId ? 'Edit Task' : 'Create New Task'}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth required label="Task Title"
                name="title" value={formData.title}
                onChange={handleChange}
              />
              <TextField
                fullWidth required multiline rows={3}
                label="Description" name="description"
                value={formData.description} onChange={handleChange}
              />
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth select label="Category"
                  name="category" value={formData.category}
                  onChange={handleChange} SelectProps={{ native: true }}
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </TextField>
                <TextField
                  fullWidth select label="Priority"
                  name="priority" value={formData.priority}
                  onChange={handleChange} SelectProps={{ native: true }}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth required type="number" label="Estimated Hours"
                  name="estimated_hours" value={formData.estimated_hours}
                  onChange={handleChange} inputProps={{ min: 0.5, step: 0.5 }}
                />
                <TextField
                  fullWidth required type="number" label="Complexity (1-10)"
                  name="complexity_score" value={formData.complexity_score}
                  onChange={handleChange} inputProps={{ min: 1, max: 10 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth type="datetime-local"
                  label="Deadline" name="deadline"
                  value={formData.deadline} onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth label="Required Skills"
                  name="required_skills"
                  value={formData.required_skills}
                  onChange={handleChange}
                  placeholder="Python, React, Design..."
                  helperText="Comma separated — used to match the right people"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button onClick={requestCloseForm} sx={{ color: '#64748B' }}>
                  Cancel
                </Button>
                <Button
                  type="submit" variant="contained" size="large" disabled={saving}
                  sx={{ bgcolor: 'var(--accent)', '&:hover': { bgcolor: 'var(--accent-dark)' } }}
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Task'}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Filters */}
        <Box sx={{
          mb: 3, p: 2.5, bgcolor: 'white',
          borderRadius: 3, border: '1px solid #EEF2F6',
          display: 'grid', gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
        }}>
          <TextField
            size="small"
            placeholder="Search title or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            inputProps={{ 'aria-label': 'Search tasks' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select size="small" label="Status" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as TaskStatus | ''); setPage(1); }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {TASK_STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select size="small" label="Priority" value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as TaskPriority | ''); setPage(1); }}
          >
            <MenuItem value="">All priorities</MenuItem>
            {TASK_PRIORITIES.map((p) => (
              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select size="small" label="Category" value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as TaskCategory | ''); setPage(1); }}
          >
            <MenuItem value="">All categories</MenuItem>
            {TASK_CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </TextField>
          {filtersActive && (
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={clearFilters}
              sx={{
                gridColumn: '1 / -1', justifySelf: 'start',
                background: 'none', border: 0, p: 0,
                color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Clear filters
            </Typography>
          )}
        </Box>

        {loading && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent)' } }} />}

        {/* Task list */}
        {!loading && tasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" sx={{ color: '#1A3C5E', fontWeight: 600 }}>
              {filtersActive ? 'No matching tasks' : 'No tasks yet'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
              {filtersActive
                ? 'Try a different search or clear the filters'
                : isManager
                  ? 'Click "New Task" to create your first task'
                  : 'No tasks have been created yet'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {tasks.map((task) => (
              <Box key={task.id}>
                <TaskCard
                  task={task}
                  onView={setViewing}
                  onEdit={isManager ? openEdit : undefined}
                  onDelete={isManager ? () => setDeleting(task) : undefined}
                  onStatusChange={loadTasks}
                />
                {isManager && task.status === 'pending' && (
                  <Box sx={{ mb: 2, mt: -1.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setAssigning({ id: task.id, title: task.title })}
                      sx={{
                        fontSize: 12,
                        borderColor: 'var(--accent)',
                        color: 'var(--accent)',
                        borderRadius: '0 0 10px 10px',
                        borderTop: 'none',
                        py: 0.6,
                        width: '100%',
                        '&:hover': { bgcolor: 'var(--accent-softer)', borderColor: 'var(--accent)' },
                      }}
                    >
                      Smart Assign
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, value) => {
                setPage(value);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              shape="rounded"
              sx={{ '& .Mui-selected': { bgcolor: 'var(--accent) !important', color: 'white' } }}
            />
          </Box>
        )}
      </Box>

      <TaskDetails task={viewing} open={Boolean(viewing)} onClose={() => setViewing(null)} />

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{deleting?.title}" and its assignment history will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmingDiscard} onClose={() => setConfirmingDiscard(false)}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editingId
              ? "Your edits to this task haven't been saved."
              : "This new task hasn't been created yet."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setConfirmingDiscard(false)} sx={{ color: '#64748B' }}>
            Keep editing
          </Button>
          <Button color="error" variant="contained" onClick={closeForm}>Discard</Button>
        </DialogActions>
      </Dialog>

      <SmartAssignDialog
        task={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={() => {
          setAssigning(null);
          loadTasks();
        }}
      />
    </Layout>
  );
};

export default TasksPage;
