import api from './api';
import { Task, CreateTaskData } from '../types/task.types';

export const taskService = {
  // Get all tasks
  getAllTasks: async (params?: any): Promise<Task[]> => {
    const response = await api.get('/tasks/', { params });
    // Handle paginated response
    return response.data.results || response.data;
  },

  // Get my tasks
  getMyTasks: async (): Promise<Task[]> => {
    const response = await api.get('/tasks/my_tasks/');
    // Handle both array and paginated responses
    return Array.isArray(response.data) ? response.data : (response.data.results || []);
  },

  // Get single task
  getTask: async (id: number): Promise<Task> => {
    const response = await api.get(`/tasks/${id}/`);
    return response.data;
  },

  // Create task
  createTask: async (data: CreateTaskData): Promise<Task> => {
    const response = await api.post('/tasks/', data);
    return response.data;
  },

  // Update task
  updateTask: async (id: number, data: Partial<Task>): Promise<Task> => {
    const response = await api.patch(`/tasks/${id}/`, data);
    return response.data;
  },

  //Get recommendations
  getRecommendations: async (taskId: number) => {
    const response = await api.get(`/tasks/${taskId}/recommend/`);
    return response.data;
  },

  // Delete task
  deleteTask: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}/`);
  },

  // Assign task
  assignTask: async (taskId: number, userId: number, justification?: string): Promise<any> => {
    const response = await api.post(`/tasks/${taskId}/assign/`, {
      user_id: userId,
      justification,
    });
    return response.data;
  },
};