export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type TaskCategory = 'development' | 'testing' | 'design' | 'documentation' | 'research' | 'review' | 'meeting' | 'other';

export interface Task {
  id: number;
  title: string;
  description: string;
  created_by: number;
  created_by_name?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  required_skills: string[];
  estimated_hours: number;
  actual_hours?: number;
  complexity_score: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: number;
  task: number;
  assigned_to: number;
  assigned_to_name?: string;
  assigned_by: number;
  assigned_by_name?: string;
  assignment_type: 'ml_recommended' | 'manual_override' | 'direct_assignment';
  justification?: string;
  assigned_at: string;
  is_active: boolean;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  required_skills: string[];
  estimated_hours: number;
  complexity_score: number;
  deadline?: string;
}

export interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
}