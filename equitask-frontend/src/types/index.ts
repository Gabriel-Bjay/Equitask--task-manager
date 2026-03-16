// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'administrator' | 'manager' | 'team_member';
  department: string;
  skills: string[];
  phone?: string;
  profile_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Task types
export interface Task {
  id: number;
  created_by: User;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  deadline: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  complexity_score: number;
  required_skills: string[];
  attachments: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  current_assignee?: User;
  is_overdue: boolean;
}

// Task Assignment types
export interface TaskAssignment {
  id: number;
  task: Task;
  assigned_to: User;
  assigned_by: User;
  assignment_type: 'ml_recommended' | 'manual_override' | 'direct_assignment';
  justification: string;
  assigned_at: string;
  accepted_at: string | null;
  deadline_acknowledged: boolean;
  is_active: boolean;
}

// Recommendation types
export interface TaskRecommendation {
  id: number;
  task: Task;
  recommended_user: User;
  confidence_score: number;
  workload_score: number;
  skill_match_score: number;
  historical_performance_score: number;
  fairness_score: number;
  rank_position: number;
  explanation: string;
  created_at: string;
}

// Notification types
export interface Notification {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  related_task_id: number | null;
  priority: 'low' | 'normal' | 'high';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  department?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string | null;
  estimated_hours: number | null;
  complexity_score: number;
  required_skills: string[];
}