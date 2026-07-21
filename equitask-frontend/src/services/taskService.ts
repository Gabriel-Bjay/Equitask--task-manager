import api from './api';
import { Task, CreateTaskData } from '../types/task.types';
import { unwrapList } from '../utils/pagination';

export const taskService = {
  // Get all tasks
  getAllTasks: async (params?: any): Promise<Task[]> => {
    const response = await api.get('/tasks/', { params });
    // Handle both bare-array and paginated ({ count, results }) responses
    return unwrapList<Task>(response.data);
  },

  // Get my tasks
  getMyTasks: async (): Promise<Task[]> => {
    const response = await api.get('/tasks/my_tasks/');
    return unwrapList<Task>(response.data);
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

  // Get recommendations (ranked candidates for a task)
  getRecommendations: async (taskId: number) => {
    const response = await api.get(`/tasks/${taskId}/recommend/`);
    return response.data;
  },

  // Delete task
  deleteTask: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}/`);
  },

  // Assign task
  assignTask: async (
    taskId: number,
    userId: number,
    justification?: string
  ): Promise<any> => {
    const response = await api.post(`/tasks/${taskId}/assign/`, {
      user_id: userId,
      justification,
    });
    return response.data;
  },
};
