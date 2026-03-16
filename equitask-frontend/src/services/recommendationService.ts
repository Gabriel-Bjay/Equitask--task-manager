import api from './api';
import { Recommendation } from '../types/recommendation.types';

export const recommendationService = {
  // Get recommendations for a task
  getRecommendations: async (taskId: number): Promise<Recommendation[]> => {
    const response = await api.get(`/recommendations/task/${taskId}/`);
    return response.data;
  },

  // Accept recommendation
  acceptRecommendation: async (recommendationId: number): Promise<any> => {
    const response = await api.post(`/recommendations/${recommendationId}/accept/`);
    return response.data;
  },

  // Override recommendation
  overrideRecommendation: async (
    taskId: number,
    userId: number,
    justification: string
  ): Promise<any> => {
    const response = await api.post(`/recommendations/override/`, {
      task_id: taskId,
      user_id: userId,
      justification,
    });
    return response.data;
  },
};