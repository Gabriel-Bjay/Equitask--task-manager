export interface Recommendation {
  id: number;
  task: number;
  recommended_user: number;
  recommended_user_name?: string;
  final_score: number;
  confidence_score: number;
  skill_match_score: number;
  workload_score: number;
  historical_performance_score: number;
  fairness_score: number;
  urgency_score: number;
  rank_position: number;
  explanation: string;
  created_at: string;
}

// One ranked candidate from GET /tasks/{id}/recommend/ (scores are 0-100).
export interface RankedCandidate {
  recommendation_id: number | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    skills: string[];
  };
  scores: {
    skill_match: number;
    workload: number;
    performance: number;
    fairness: number;
    urgency: number;
    final: number;
  };
  confidence: number;
  rank: number;
  active_hours: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: string;
}

export interface TaskRecommendations {
  task_id: number;
  task_title: string;
  required_skills: string[];
  weights: Record<'skill' | 'workload' | 'performance' | 'fairness' | 'urgency', number>;
  recommendations: RankedCandidate[];
}

export interface ScoreBreakdown {
  skill_match: number;
  workload: number;
  historical: number;
  fairness: number;
  urgency: number;
}