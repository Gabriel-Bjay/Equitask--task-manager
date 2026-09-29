import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';
import { TaskState, Task, CreateTaskData, TaskQuery } from '../../types/task.types';
import { apiErrorMessage } from '../../utils/apiError';

const initialState: TaskState = {
  tasks: [],
  totalCount: 0,
  myTasks: [],
  currentTask: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params?: TaskQuery) => {
  return await taskService.getTaskPage(params);
});

export const fetchMyTasks = createAsyncThunk('tasks/fetchMy', async () => {
  return await taskService.getMyTasks();
});

export const fetchTask = createAsyncThunk('tasks/fetchOne', async (id: number) => {
  return await taskService.getTask(id);
});

// Write thunks reject with a readable message so forms can show the API's reason.
export const createTask = createAsyncThunk<Task, CreateTaskData, { rejectValue: string }>(
  'tasks/create',
  async (data, { rejectWithValue }) => {
    try {
      return await taskService.createTask(data);
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error, 'Failed to create task'));
    }
  }
);

export const updateTask = createAsyncThunk<
  Task, { id: number; data: Partial<Task> }, { rejectValue: string }
>(
  'tasks/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await taskService.updateTask(id, data);
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error, 'Failed to update task'));
    }
  }
);

export const deleteTask = createAsyncThunk<number, number, { rejectValue: string }>(
  'tasks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id);
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error, 'Failed to delete task'));
    }
  }
);

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
      state.tasks = action.payload.results;
      state.totalCount = action.payload.count;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch tasks';
    });

    // Fetch my tasks
    builder.addCase(fetchMyTasks.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMyTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.myTasks = action.payload;
    });
    builder.addCase(fetchMyTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch your tasks';
    });

    // Fetch single task
    builder.addCase(fetchTask.fulfilled, (state, action) => {
      state.currentTask = action.payload;
    });

    // Create task
    builder.addCase(createTask.fulfilled, (state, action) => {
      state.tasks.unshift(action.payload);
      state.totalCount += 1;
    });

    // Update task
    builder.addCase(updateTask.fulfilled, (state, action) => {
      for (const list of [state.tasks, state.myTasks]) {
        const index = list.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          list[index] = action.payload;
        }
      }
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = action.payload;
      }
    });

    // Delete task
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      state.myTasks = state.myTasks.filter((t) => t.id !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    });
  },
});

export const { clearCurrentTask } = taskSlice.actions;
export default taskSlice.reducer;