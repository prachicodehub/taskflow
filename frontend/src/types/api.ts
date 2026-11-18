// TypeScript mirrors of the backend DTOs (com.taskflow.dto). Keep these 1:1 with the Kotlin classes.

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  /** ISO-8601 instant */
  expiresAt: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
}

export interface ProjectSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** yyyy-MM-dd */
  dueDate: string | null;
  overdue: boolean;
  assignee: User | null;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRequest {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status?: TaskStatus | null;
  dueDate?: string | null;
  assigneeId?: number | null;
}

export type TaskSort = 'createdAt' | 'dueDate' | 'priority';
export type SortDirection = 'asc' | 'desc';

export interface TaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  sort: TaskSort;
  direction: SortDirection;
  page: number;
  size: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: ApiFieldError[];
}
