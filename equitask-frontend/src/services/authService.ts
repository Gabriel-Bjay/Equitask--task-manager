import api from './api';
import { LoginCredentials, RegisterData, User, AuthTokens } from '../types/auth.types';

export const authService = {
  // Login
  login: async (credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },

  // Register
  register: async (data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  // Update profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch('/auth/me/', data);
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post('/auth/logout/');
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
  },

  // Refresh token
  refreshToken: async (refresh: string): Promise<AuthTokens> => {
    const response = await api.post('/auth/token/refresh/', { refresh });
    return response.data;
  },
};