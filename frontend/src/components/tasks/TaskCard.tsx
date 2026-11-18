import type { DragEvent } from 'react';
import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from '../../types/api';
import { formatDate, isOverdue } from '../../utils/date';
import { Avatar } from '../ui/Avatar';
import { PRIORITY_BG, PriorityBadge } from '../ui/Badge';

export const TASK_DRAG_TYPE = 'application/x-taskflow-task';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  // Computed locally too, so a task stays correct even if the page was left open past midnight.
  const overdue = task.overdue || isOverdue(task);
  const done = task.status === 'DONE';

  const handleDragStart = (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.setData(TASK_DRAG_TYPE, String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article
      draggable={!!onStatusChange}
      onDragStart={handleDragStart}
      data-testid={`task-card-${task.id}`}
      data-overdue={overdue}
      aria-label={task.title}
      className={`group relative overflow-hidden rounded-[10px] bg-white py-3 pl-4 pr-3 shadow-[0_1px_2px_rgba(20,33,61,0.06)] ring-1 transition hover:shadow-[0_8px_20px_-10px_rgba(20,33,61,0.35)] ${
        overdue ? 'ring-flag-500/50' : 'ring-ink-200 hover:ring-ink-300'
      } ${onStatusChange ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2.5 left-0 w-1 rounded-r-full ${done ? 'bg-ink-200' : PRIORITY_BG[task.priority]}`}
      />

      <div className="flex items-start justify-between gap-3">
        <h4 className={`text-[15px] font-semibold leading-snug break-words ${done ? 'text-ink-400 line-through decoration-ink-300' : 'text-ink-900'}`}>
          {task.title}
        </h4>
        {task.assignee ? (
          <span title={`${task.assignee.name} (${task.assignee.email})`} aria-label={`Assigned to ${task.assignee.name}`} role="img">
            <Avatar id={task.assignee.id} name={task.assignee.name} />
          </span>
        ) : (
          <span
            role="img"
            aria-label="Unassigned"
            title="Unassigned"
            className="h-6 w-6 shrink-0 rounded-full border-[1.5px] border-dashed border-ink-300"
          />
        )}
      </div>

      {task.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{task.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <PriorityBadge priority={task.priority} />
        {task.dueDate ? (
          overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-flag-50 px-2 py-0.5 text-xs font-semibold text-flag-700">
              <ClockIcon />
              Overdue, {formatDate(task.dueDate)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-ink-500">
              <CalendarIcon />
              Due {formatDate(task.dueDate)}
            </span>
          )
        ) : (
          <span className="text-xs text-ink-400">No due date</span>
        )}
      </div>

      {(onStatusChange || onEdit || onDelete) && (
        <div className="mt-3 flex items-center gap-0.5 border-t border-ink-100 pt-2">
          {onStatusChange && (
            <select
              aria-label={`Status of ${task.title}`}
              value={task.status}
              onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
              title="Change status"
              className="mr-auto min-w-0 cursor-pointer rounded-[8px] border-0 bg-transparent py-1 pl-1.5 pr-7 text-xs font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800 focus:ring-2 focus:ring-ink-700"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label="Edit"
              title="Edit task"
              className="rounded-[8px] p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label="Delete"
              title="Delete task"
              className="rounded-[8px] p-1.5 text-ink-400 hover:bg-flag-50 hover:text-flag-700"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 8.5h6.6l.7-8.5" />
              </svg>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
    </svg>
  );
}
