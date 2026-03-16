export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'critical', label: 'Critical', color: '#9c27b0' },
];

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#9e9e9e' },
  { value: 'assigned', label: 'Assigned', color: '#2196f3' },
  { value: 'in_progress', label: 'In Progress', color: '#ff9800' },
  { value: 'completed', label: 'Completed', color: '#4caf50' },
  { value: 'overdue', label: 'Overdue', color: '#f44336' },
  { value: 'cancelled', label: 'Cancelled', color: '#757575' },
];

export const TASK_CATEGORIES = [
  { value: 'development', label: 'Development' },
  { value: 'testing', label: 'Testing' },
  { value: 'design', label: 'Design' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'research', label: 'Research' },
  { value: 'review', label: 'Review' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
];

export const USER_ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_member', label: 'Team Member' },
];

export const RAPID_PRINCIPLES = [
  { key: 'responsibility', label: 'Responsibility', color: '#2196f3' },
  { key: 'accountability', label: 'Accountability', color: '#4caf50' },
  { key: 'professionalism', label: 'Professionalism', color: '#ff9800' },
  { key: 'inclusivity', label: 'Inclusivity', color: '#9c27b0' },
  { key: 'diversity', label: 'Diversity', color: '#00bcd4' },
];