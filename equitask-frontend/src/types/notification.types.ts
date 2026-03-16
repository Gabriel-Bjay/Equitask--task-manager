export type NotificationType = 
  | 'task_assigned'
  | 'deadline_reminder_48h'
  | 'deadline_reminder_24h'
  | 'task_overdue'
  | 'task_completed'
  | 'task_reassigned'
  | 'approval_request'
  | 'system_announcement';

export interface Notification {
  id: number;
  user: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_task?: number;
  priority: 'low' | 'normal' | 'high';
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}