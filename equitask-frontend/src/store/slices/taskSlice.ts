import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';
import { TaskState, Task, CreateTaskData } from '../../types/task.types';

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params?: any) => {
  return await taskService.getAllTasks(params);
});

export const fetchMyTasks = createAsyncThunk('tasks/fetchMy', async () => {
  return await taskService.getMyTasks();
});

export const fetchTask = createAsyncThunk('tasks/fetchOne', async (id: number) => {
  return await taskService.getTask(id);
});

export const createTask = createAsyncThunk('tasks/create', async (data: CreateTaskData) => {
  return await taskService.createTask(data);
});

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }: { id: number; data: Partial<Task> }) => {
    return await taskService.updateTask(id, data);
  }
);

export const deleteTask = createAsyncThunk('tasks/delete', async (id: number) => {
  await taskService.deleteTask(id);
  return id;
});

// Slice
const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all tasks
    builder.addCase(fetchTasks.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch tasks';
    });

    // Fetch my tasks
    builder.addCase(fetchMyTasks.fulfilled, (state, action) => {
      state.tasks = action.payload;
    });

    // Fetch single task
    builder.addCase(fetchTask.fulfilled, (state, action) => {
      state.currentTask = action.payload;
    });

    // Create task
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.tasks.unshift(action.payload);
    });

    // Update task
    builder.addCase(updateTask.fulfilled, (state, action) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = action.payload;
      }
    });

    // Delete task
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    });
  },
});

export const { clearCurrentTask } = taskSlice.actions;
export default taskSlice.reducer;