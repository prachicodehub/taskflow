import type { ReactNode } from 'react';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type SortDirection,
  type TaskPriority,
  type TaskQuery,
  type TaskSort,
  type TaskStatus,
  type User,
} from '../../types/api';

interface TaskFiltersProps {
  query: TaskQuery;
  users: User[];
  onChange: (patch: Partial<TaskQuery>) => void;
}

/** A compact pill-shaped select; an active filter turns ink-filled so it's obvious what's applied. */
function Pill({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return (
    <label
      className={`relative inline-flex items-center rounded-full text-sm ring-1 transition-colors ${
        active ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-700 ring-ink-200 hover:ring-ink-400'
      }`}
    >
      <span className={`pl-3.5 ${active ? 'text-ink-300' : 'text-ink-500'}`}>{label}</span>
      {children}
      <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

const SELECT = 'cursor-pointer appearance-none bg-transparent py-1.5 pl-1.5 pr-8 font-semibold focus:outline-none [&>option]:text-ink-900';

export function TaskFilters({ query, users, onChange }: TaskFiltersProps) {
  const active = !!(query.status || query.priority || query.assigneeId);

  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter and sort tasks">
      <Pill label="Status" active={!!query.status}>
        <select
          className={SELECT}
          value={query.status ?? ''}
          onChange={(e) => onChange({ status: (e.target.value || undefined) as TaskStatus | undefined, page: 0 })}
        >
          <option value="">All</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Pill>

      <Pill label="Priority" active={!!query.priority}>
        <select
          className={SELECT}
          value={query.priority ?? ''}
          onChange={(e) => onChange({ priority: (e.target.value || undefined) as TaskPriority | undefined, page: 0 })}
        >
          <option value="">All</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </Pill>

      <Pill label="Assignee" active={!!query.assigneeId}>
        <select
          className={SELECT}
          value={query.assigneeId ?? ''}
          onChange={(e) => onChange({ assigneeId: e.target.value ? Number(e.target.value) : undefined, page: 0 })}
        >
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Pill>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ status: undefined, priority: undefined, assigneeId: undefined, page: 0 })}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900"
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Pill label="Sort" active={false}>
          <select className={SELECT} value={query.sort} onChange={(e) => onChange({ sort: e.target.value as TaskSort, page: 0 })}>
            <option value="createdAt">Date created</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
          </select>
        </Pill>
        <button
          type="button"
          onClick={() => onChange({ direction: (query.direction === 'asc' ? 'desc' : 'asc') as SortDirection, page: 0 })}
          aria-label={query.direction === 'asc' ? 'Ascending order, switch to descending' : 'Descending order, switch to ascending'}
          title={query.direction === 'asc' ? 'Ascending' : 'Descending'}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 hover:ring-ink-400"
        >
          <svg viewBox="0 0 16 16" className={`h-4 w-4 transition-transform ${query.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v10M4 9l4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
