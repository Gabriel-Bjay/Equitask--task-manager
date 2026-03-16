import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Box,
  OutlinedInput,
} from '@mui/material';
import { createTask } from '../../store/slices/taskSlice';
import { AppDispatch } from '../../store/store';
import { CreateTaskData, TaskCategory, TaskPriority } from '../../types/task.types';
import { TASK_PRIORITIES, TASK_CATEGORIES } from '../../utils/constants';
import { toast } from 'react-toastify';

interface CreateTaskProps {
  open: boolean;
  onClose: () => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    category: 'development' as TaskCategory,
    priority: 'medium' as TaskPriority,
    required_skills: [],
    estimated_hours: 8,
    complexity_score: 5,
    deadline: '',
  });

  const [skillInput, setSkillInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        required_skills: [...formData.required_skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createTask(formData)).unwrap();
      toast.success('Task created successfully!');
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'development' as TaskCategory,
        priority: 'medium' as TaskPriority,
        required_skills: [],
        estimated_hours: 8,
        complexity_score: 5,
        deadline: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="title"
                label="Task Title"
                value={formData.title}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as TaskCategory })
                  }
                  label="Category"
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  label="Priority"
                >
                  {TASK_PRIORITIES.map((pri) => (
                    <MenuItem key={pri.value} value={pri.value}>
                      {pri.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                name="estimated_hours"
                label="Estimated Hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                inputProps={{ min: 0.5, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                name="complexity_score"
                label="Complexity (1-10)"
                value={formData.complexity_score}
                onChange={handleChange}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="datetime-local"
                name="deadline"
                label="Deadline"
                value={formData.deadline}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Add Required Skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                helperText="Press Enter to add"
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.required_skills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={() => handleRemoveSkill(skill)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Create Task
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateTask;