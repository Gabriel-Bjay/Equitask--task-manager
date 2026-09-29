import api from './api';
import { Recommendation } from '../types/recommendation.types';
import { unwrapList } from '../utils/pagination';

export const recommendationService = {
  // Get recommendations for a task
  getRecommendations: async (taskId: number): Promise<Recommendation[]> => {
    const response = await api.get(`/recommendations/task/${taskId}/`);
    // Handle both bare-array and paginated ({ count, results }) responses
    return unwrapList<Recommendation>(response.data);
  },

  // Accept recommendation; the justification is stored with the assignment
  acceptRecommendation: async (recommendationId: number, justification = ''): Promise<any> => {
    const response = await api.post(`/recommendations/${recommendationId}/accept/`, {
      justification,
    });
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
