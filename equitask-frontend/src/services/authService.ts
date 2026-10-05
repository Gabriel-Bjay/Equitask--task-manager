import api from './api';
import { LoginCredentials, RegisterData, User, AuthTokens, DemoAccount } from '../types/auth.types';

export const authService = {
  // Login
  login: async (credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },

  // Demo logins the API offers; empty when its public demo is off.
  demoAccounts: async (): Promise<DemoAccount[]> => {
    const response = await api.get('/auth/demo-accounts/');
    return response.data.accounts;
  },

  // Sign in as the demo manager or team member, without a password.
  demoLogin: async (role: DemoAccount['role']): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post('/auth/demo-login/', { role });
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

  // Logout: revoke the refresh token server-side, and always clear the local
  // session so a failed request can never leave the user stuck signed in.
  logout: async (): Promise<void> => {
    try {
      const { refresh } = JSON.parse(localStorage.getItem('tokens') || '{}');
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // An expired or already-revoked token has nothing left to revoke.
    } finally {
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
    }
  },

  // Refresh token
  refreshToken: async (refresh: string): Promise<AuthTokens> => {
    const response = await api.post('/auth/token/refresh/', { refresh });
    return response.data;
  },
};