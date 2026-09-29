import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// The backend rotates refresh tokens and blacklists the old one on use, so the
// rotated token must replace the stored one, and concurrent 401s must share a
// single refresh call (a second call with the old token would be rejected).
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = async (refresh: string): Promise<string> => {
  const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
  const { access, refresh: rotated } = response.data;
  localStorage.setItem('tokens', JSON.stringify({ access, refresh: rotated ?? refresh }));
  return access;
};

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const tokens = localStorage.getItem('tokens');

    // Only refresh for a signed-in session; a 401 from the login form itself
    // must reach the caller so it can show "Invalid credentials".
    if (error.response?.status === 401 && tokens && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken(JSON.parse(tokens).refresh).finally(() => {
            refreshInFlight = null;
          });
        }
        const access = await refreshInFlight;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;