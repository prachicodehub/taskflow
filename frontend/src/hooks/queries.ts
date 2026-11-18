import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { projectApi, taskApi, userApi } from '../api/endpoints';
import type { CreateProjectRequest, PageResponse, Task, TaskQuery, TaskRequest, TaskStatus } from '../types/api';

/** Central query keys, so invalidation always hits the right cache entries. */
export const queryKeys = {
  projects: ['projects'] as const,
  users: ['users'] as const,
  summary: (projectId: number) => ['projects', projectId, 'summary'] as const,
  tasks: (projectId: number) => ['projects', projectId, 'tasks'] as const,
  taskList: (projectId: number, query: TaskQuery) => ['projects', projectId, 'tasks', query] as const,
};

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: projectApi.list });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => projectApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useProjectSummary(projectId: number) {
  return useQuery({ queryKey: queryKeys.summary(projectId), queryFn: () => projectApi.summary(projectId) });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: userApi.list, staleTime: 5 * 60_000 });
}

export function useTasks(projectId: number, query: TaskQuery) {
  return useQuery({
    queryKey: queryKeys.taskList(projectId, query),
    queryFn: () => taskApi.list(projectId, query),
    placeholderData: keepPreviousData, // no flicker when changing filters/pages
  });
}

/** Create, update, move and delete tasks. Every success refreshes the task list and the summary. */
export function useTaskMutations(projectId: number) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.tasks(projectId) }),
      qc.invalidateQueries({ queryKey: queryKeys.summary(projectId) }),
    ]);

  const create = useMutation({
    mutationFn: (body: TaskRequest) => taskApi.create(projectId, body),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: TaskRequest }) => taskApi.update(taskId, body),
    onSuccess: refresh,
  });

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) => taskApi.updateStatus(taskId, status),
    // Optimistic update: the card jumps columns immediately; rolled back if the server says no.
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.tasks(projectId) });
      const previous = qc.getQueriesData<PageResponse<Task>>({ queryKey: queryKeys.tasks(projectId) });
      qc.setQueriesData<PageResponse<Task>>({ queryKey: queryKeys.tasks(projectId) }, (page) =>
        page
          ? { ...page, content: page.content.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : page,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (taskId: number) => taskApi.remove(taskId),
    onSuccess: refresh,
  });

  return { create, update, updateStatus, remove };
}
