import type { Task } from '../types/api';

/** Today's date as yyyy-MM-dd in the user's local time zone (what <input type="date"> uses). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A task is overdue when it has a due date before today and is not done. */
export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, now: Date = new Date()): boolean {
  if (!task.dueDate || task.status === 'DONE') return false;
  return task.dueDate < todayIso(now); // ISO dates compare correctly as strings
}

/** "2026-11-20" → "Nov 20, 2026". Parsed as a local date so it never shifts by a day. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
