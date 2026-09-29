import api from './api';
import { Task, CreateTaskData, TaskQuery } from '../types/task.types';
import { TaskRecommendations } from '../types/recommendation.types';
import { PaginatedResponse, unwrapList } from '../utils/pagination';

export const taskService = {
  // One page of tasks, plus the total count across all pages
  getTaskPage: async (params?: TaskQuery): Promise<PaginatedResponse<Task>> => {
    const response = await api.get('/tasks/', { params });
    return response.data;
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
  getRecommendations: async (taskId: number): Promise<TaskRecommendations> => {
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
