import { api } from './axiosClient';
import type {
  AuthResponse,
  CreateProjectRequest,
  LoginRequest,
  PageResponse,
  Project,
  ProjectSummary,
  RegisterRequest,
  Task,
  TaskQuery,
  TaskRequest,
  TaskStatus,
  User,
} from '../types/api';

export const authApi = {
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const userApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
};

export const projectApi = {
  list: () => api.get<Project[]>('/projects').then((r) => r.data),
  create: (body: CreateProjectRequest) => api.post<Project>('/projects', body).then((r) => r.data),
  summary: (projectId: number) =>
    api.get<ProjectSummary>(`/projects/${projectId}/summary`).then((r) => r.data),
};

export const taskApi = {
  list: (projectId: number, query: TaskQuery) =>
    api
      .get<PageResponse<Task>>(`/projects/${projectId}/tasks`, {
        // undefined values are dropped by Axios, so only active filters are sent.
        params: { ...query },
      })
      .then((r) => r.data),
  create: (projectId: number, body: TaskRequest) =>
    api.post<Task>(`/projects/${projectId}/tasks`, body).then((r) => r.data),
  update: (taskId: number, body: TaskRequest) => api.put<Task>(`/tasks/${taskId}`, body).then((r) => r.data),
  updateStatus: (taskId: number, status: TaskStatus) =>
    api.patch<Task>(`/tasks/${taskId}/status`, { status }).then((r) => r.data),
  remove: (taskId: number) => api.delete<void>(`/tasks/${taskId}`).then(() => undefined),
};
