import axios from './axios';
import { LoginFormData, RegisterFormData } from '../types';

export const login = (credentials: LoginFormData) => {
  return axios.post('/auth/login/', credentials);
};

export const register = (data: RegisterFormData) => {
  return axios.post('/auth/register/', data);
};

export const logout = (refreshToken: string) => {
  return axios.post('/auth/logout/', { refresh: refreshToken });
};

export const getCurrentUser = () => {
  return axios.get('/auth/me/');
};

export const refreshToken = (refresh: string) => {
  return axios.post('/auth/refresh/', { refresh });
};