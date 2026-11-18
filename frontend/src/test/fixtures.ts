import type { Task } from '../types/api';

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Write the README',
    description: 'Setup steps and API docs',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: null,
    overdue: false,
    assignee: { id: 7, name: 'Asha Rao', email: 'asha@example.com' },
    projectId: 3,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}
