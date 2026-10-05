import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { AuthState, DemoAccount, LoginCredentials, RegisterData } from '../../types/auth.types';
import { apiErrorMessage } from '../../utils/apiError';

// Safe JSON parse helper
const safeParse = (key: string) => {
  const item = localStorage.getItem(key);
  if (!item || item === 'undefined' || item === 'null') {
    return null;
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    localStorage.removeItem(key); // Clean up bad data
    return null;
  }
};

// Initial state
const initialState: AuthState = {
  user: safeParse('user'),
  tokens: safeParse('tokens'),
  isAuthenticated: !!safeParse('tokens'),   
  loading: false,
  error: null,
};

// Async thunks 
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('tokens', JSON.stringify(data.tokens));
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      return rejectWithValue(apiErrorMessage(error, 'Login failed'));
    }
  }
);

export const demoLogin = createAsyncThunk(
  'auth/demoLogin',
  async (role: DemoAccount['role'], { rejectWithValue }) => {
    try {
      const data = await authService.demoLogin(role);
      localStorage.setItem('tokens', JSON.stringify(data.tokens));
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      return rejectWithValue(apiErrorMessage(error, 'The demo is unavailable right now.'));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      localStorage.setItem('tokens', JSON.stringify(response.tokens));
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      return rejectWithValue(apiErrorMessage(error, 'Registration failed'));
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get user');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// Slice (unchanged)
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // For sessions the server already ended (e.g. after deactivation).
    clearSession: (state) => {
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(demoLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(demoLogin.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
    });
    builder.addCase(demoLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(getCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, clearSession } = authSlice.actions;
export default authSlice.reducer;