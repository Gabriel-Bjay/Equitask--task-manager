import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Typography, Box, Button, TextField, Stack } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import TaskCard from '../components/tasks/TaskCard';
import { fetchTasks, createTask } from '../store/slices/taskSlice';
import { AppDispatch, RootState } from '../store/store';
import { toast } from 'react-toastify';

const TasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks } = useSelector((state: RootState) => state.tasks);
  const { user } = useSelector((state: RootState) => state.auth);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'development' as const,
    priority: 'medium' as const,
    estimated_hours: 8,
    complexity_score: 5,
  });

  useEffect(() => {
    dispatch(fetchTasks(undefined));
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createTask({
        ...formData,
        required_skills: [],
      })).unwrap();
      toast.success('Task created successfully!');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        category: 'development' as const,
        priority: 'medium' as const,
        estimated_hours: 8,
        complexity_score: 5,
      });
      dispatch(fetchTasks(undefined));
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const isManager = user?.role === 'administrator' || user?.role === 'manager';

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">All Tasks</Typography>
          {isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'New Task'}
            </Button>
          )}
        </Box>

        {showForm && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              mb: 4,
              p: 3,
              backgroundColor: 'white',
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Create New Task
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                label="Task Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />
              
              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  SelectProps={{ native: true }}
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="design">Design</option>
                  <option value="documentation">Documentation</option>
                  <option value="research">Research</option>
                  <option value="review">Review</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </TextField>
                
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  SelectProps={{ native: true }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </TextField>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Hours"
                  name="estimated_hours"
                  value={formData.estimated_hours}
                  onChange={handleChange}
                  inputProps={{ min: 1, step: 0.5 }}
                />
                
                <TextField
                  fullWidth
                  type="number"
                  label="Complexity (1-10)"
                  name="complexity_score"
                  value={formData.complexity_score}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Box>
              
              <Button type="submit" variant="contained" size="large">
                Create Task
              </Button>
            </Stack>
          </Box>
        )}

        <Typography variant="body1" color="textSecondary" paragraph>
          {tasks.length} task(s) found
        </Typography>

        {tasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="textSecondary">
              No tasks yet
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {isManager ? 'Click "New Task" to create your first task' : 'No tasks have been created yet'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default TasksPage;