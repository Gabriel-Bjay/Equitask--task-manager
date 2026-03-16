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

export interface ScoreBreakdown {
  skill_match: number;
  workload: number;
  historical: number;
  fairness: number;
  urgency: number;
}